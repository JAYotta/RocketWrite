import io
from unittest.mock import patch

import numpy as np
import pytest
from fastapi.testclient import TestClient
from scipy.io import wavfile

from backend.server import MODEL_PATH, app

client = TestClient(app)


@pytest.fixture
def mock_mlx():
    """Mock mlx_whisper and ModelHolder to avoid loading real models."""
    with (
        patch("backend.server.mlx_whisper") as mock_whisper,
        patch("backend.server.ModelHolder") as mock_holder,
    ):
        # Setup default response for transcribe
        mock_whisper.transcribe.return_value = {"text": "Hello World", "language": "en"}
        yield mock_whisper, mock_holder


def test_health_check():
    """Test /health endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "model": MODEL_PATH}


def test_startup_warmup(mock_mlx):
    """Test that lifespan startup warms up the model."""
    # TestClient context manager triggers startup/shutdown events
    with TestClient(app):
        _, mock_holder = mock_mlx
        # Check if ModelHolder.get_model was called
        # Note: lifespan runs on startup. TestClient(app) triggers it.
        assert mock_holder.get_model.called


def test_transcribe_exception(mock_mlx):
    """Test /transcribe handles internal exceptions gracefully."""
    mock_whisper, _ = mock_mlx
    mock_whisper.transcribe.side_effect = Exception("MLX Error")

    # Create valid WAV
    byte_io = io.BytesIO()
    wavfile.write(byte_io, 16000, np.zeros(16000, dtype=np.int16))
    byte_io.seek(0)

    response = client.post(
        "/transcribe", files={"file": ("test.wav", byte_io, "audio/wav")}
    )

    # Should catch exception and return it in JSON
    # It might return {"error": "MLX Error"} with 200 OK based on current server.py
    assert response.status_code == 200
    assert response.json() == {"error": "MLX Error"}


def test_startup_warmup_error(mock_mlx):
    """Test warmup failure is logged but doesn't crash."""
    _, mock_holder = mock_mlx
    mock_holder.get_model.side_effect = Exception("Download failed")

    with TestClient(app):
        assert mock_holder.get_model.called


def test_transcribe_resample_warning(mock_mlx):
    """Test 44.1kHz audio triggers warning log."""
    mock_whisper, _ = mock_mlx

    # Create 44.1kHz WAV
    byte_io = io.BytesIO()
    wavfile.write(byte_io, 44100, np.zeros(44100, dtype=np.int16))
    byte_io.seek(0)

    with patch("backend.server.logger") as mock_logger:
        client.post("/transcribe", files={"file": ("test.wav", byte_io, "audio/wav")})
        # Check for warning call about sample rate
        # We need to filter calls because logger is used a lot
        warning_calls = [args[0] for args, _ in mock_logger.warning.call_args_list]
        assert any("Input sample rate is 44100" in str(arg) for arg in warning_calls)


def test_transcribe_dtypes(mock_mlx):
    """Test int32 and uint8 audio formats."""
    mock_whisper, _ = mock_mlx

    # Test int32
    byte_io = io.BytesIO()
    # int32 range: -2^31 to 2^31-1
    wavfile.write(byte_io, 16000, np.zeros(16000, dtype=np.int32))
    byte_io.seek(0)
    client.post("/transcribe", files={"file": ("test.wav", byte_io, "audio/wav")})

    # Test uint8
    byte_io_u8 = io.BytesIO()
    # uint8 range: 0-255, 128 is silence
    wavfile.write(byte_io_u8, 16000, np.full(16000, 128, dtype=np.uint8))
    byte_io_u8.seek(0)
    client.post("/transcribe", files={"file": ("test.wav", byte_io_u8, "audio/wav")})

    assert mock_whisper.transcribe.call_count >= 2


def test_transcribe_unsupported_dtype(mock_mlx):
    """Test unsupported audio dtype (e.g. int64)."""
    # Create fake int64 wav (scipy won't write this standardly, but we can mock the read return if needed)
    # Or just use a byte stream that scipy might interpret oddly?
    # Easier: Mock wavfile.read to return int64 array

    with patch("backend.server.wavfile.read") as mock_read:
        # Return valid sample rate but weird data type
        mock_read.return_value = (16000, np.zeros(16000, dtype=np.int64))

        response = client.post(
            "/transcribe", files={"file": ("test.wav", b"dummy", "audio/wav")}
        )

        assert response.status_code == 200
        assert "Unsupported audio data type" in response.json().get("error", "")


def test_transcribe_float64(mock_mlx):
    """Test float64 audio is converted to float32."""
    mock_whisper, _ = mock_mlx

    with patch("backend.server.wavfile.read") as mock_read:
        # Return float64 data
        mock_read.return_value = (16000, np.zeros(16000, dtype=np.float64))

        response = client.post(
            "/transcribe", files={"file": ("test.wav", b"dummy", "audio/wav")}
        )

        assert response.status_code == 200
        assert response.json()["text"] == "Hello World"

        # Verify it was converted to float32 passed to MLX
        args = mock_whisper.transcribe.call_args[0]
        assert args[0].dtype == np.float32


def test_transcribe_success(mock_mlx):
    """Test /transcribe endpoint with valid audio."""
    mock_whisper, _ = mock_mlx

    # Create dummy WAV file in memory
    sample_rate = 16000
    duration = 1.0  # seconds
    t = np.linspace(0, duration, int(sample_rate * duration))
    # Generate silence/noise
    audio_data = (np.sin(2 * np.pi * 440 * t) * 32767).astype(np.int16)

    byte_io = io.BytesIO()
    wavfile.write(byte_io, sample_rate, audio_data)
    byte_io.seek(0)

    response = client.post(
        "/transcribe",
        files={"file": ("test.wav", byte_io, "audio/wav")},
        data={"language": "en"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["text"] == "Hello World"
    assert data["language"] == "en"
    assert "processing_time" in data

    # Verify mlx_whisper.transcribe was called
    mock_whisper.transcribe.assert_called_once()
    # Check arguments: first arg should be numpy array
    call_args = mock_whisper.transcribe.call_args
    assert isinstance(call_args[0][0], np.ndarray)
    assert call_args[1]["path_or_hf_repo"] == MODEL_PATH
    assert call_args[1]["language"] == "en"


def test_transcribe_default_language(mock_mlx):
    """Test /transcribe endpoint default language (zh)."""
    mock_whisper, _ = mock_mlx

    # Create dummy WAV
    byte_io = io.BytesIO()
    wavfile.write(byte_io, 16000, np.zeros(16000, dtype=np.int16))
    byte_io.seek(0)

    response = client.post(
        "/transcribe",
        files={"file": ("test.wav", byte_io, "audio/wav")},
        # No language param
    )

    assert response.status_code == 200
    # Check if called with zh
    call_args = mock_whisper.transcribe.call_args
    assert call_args[1]["language"] == "zh"


def test_transcribe_invalid_wav(mock_mlx):
    """Test /transcribe with non-wav data."""
    response = client.post(
        "/transcribe", files={"file": ("test.txt", b"not a wav file", "text/plain")}
    )

    # Should return {"error": "Invalid WAV file"} or similar, not 500 crash
    assert response.status_code == 200  # App logic returns 200 with error field
    assert "error" in response.json()

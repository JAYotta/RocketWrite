/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../App";

// Mock useMicVAD hook
const mockStart = vi.fn();
const mockPause = vi.fn();

vi.mock("@ricky0123/vad-react", () => ({
  useMicVAD: vi.fn(),
}));

// Mock useCommandParser
vi.mock("../../hooks/useCommandParser", () => ({
  useCommandParser: vi.fn(() => ({
    parseCommand: vi.fn(),
    isLoading: false,
    lastCommand: null,
  })),
}));

// Mock other dependencies
vi.mock("axios", () => ({
  default: {
    post: vi.fn(),
  },
}));

vi.mock("ai", () => ({
  generateObject: vi.fn(),
}));

vi.mock("ai-sdk-ollama", () => ({
  ollama: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

import { useMicVAD } from "@ricky0123/vad-react";
import { useCommandParser } from "../../hooks/useCommandParser";

/**
 * Tests for Microphone Button UI behavior in App component
 *
 * These tests focus on VAD (Voice Activity Detection) related UI states:
 * - Button states based on listening/userSpeaking
 * - Button interactions (start/pause)
 * - Loading states during command parsing
 *
 * Note: Icon rendering (Play, Pause, Microphone, MicrophoneSpeaking) is handled
 * by HeroUI's Button component using render props. We test the button's
 * accessibility attributes and behavior rather than the exact icon rendered,
 * as icon testing would be brittle and implementation-dependent.
 */
describe("Microphone Button (VAD)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should show Microphone icon when not listening and not hovered", () => {
    vi.mocked(useMicVAD).mockReturnValue({
      listening: false,
      userSpeaking: false,
      start: mockStart,
      pause: mockPause,
    } as any);

    render(<App />);

    // Check for Microphone icon (not listening, not hovered)
    const button = screen.getByRole("button", {
      name: /start recording/i,
    });
    expect(button).toBeInTheDocument();
    // Icon should be Microphone (default state)
    expect(button.querySelector("svg")).toBeInTheDocument();
  });

  it("should show correct aria-label when not listening", () => {
    vi.mocked(useMicVAD).mockReturnValue({
      listening: false,
      userSpeaking: false,
      start: mockStart,
      pause: mockPause,
    } as any);

    render(<App />);

    const button = screen.getByRole("button", {
      name: /start recording/i,
    });
    expect(button).toHaveAttribute("aria-label", "Start Recording");
  });

  it("should show correct aria-label when listening", () => {
    vi.mocked(useMicVAD).mockReturnValue({
      listening: true,
      userSpeaking: false,
      start: mockStart,
      pause: mockPause,
    } as any);

    render(<App />);

    const button = screen.getByRole("button", {
      name: /stop recording/i,
    });
    expect(button).toHaveAttribute("aria-label", "Stop Recording");
  });

  it("should render button when listening and user is speaking", () => {
    vi.mocked(useMicVAD).mockReturnValue({
      listening: true,
      userSpeaking: true,
      start: mockStart,
      pause: mockPause,
    } as any);

    render(<App />);

    const button = screen.getByRole("button", {
      name: /stop recording/i,
    });
    expect(button).toBeInTheDocument();
    // Note: Icon rendering (MicrophoneSpeaking vs Microphone) is handled by
    // HeroUI's Button render prop. Testing the exact icon would require
    // inspecting the internal DOM structure, which is brittle.
  });

  it("should call start when clicking button while not listening", async () => {
    const user = userEvent.setup();
    vi.mocked(useMicVAD).mockReturnValue({
      listening: false,
      userSpeaking: false,
      start: mockStart,
      pause: mockPause,
    } as any);

    render(<App />);

    const button = screen.getByRole("button", {
      name: /start recording/i,
    });

    await user.click(button);
    expect(mockStart).toHaveBeenCalledTimes(1);
  });

  it("should call pause when clicking button while listening", async () => {
    const user = userEvent.setup();
    vi.mocked(useMicVAD).mockReturnValue({
      listening: true,
      userSpeaking: false,
      start: mockStart,
      pause: mockPause,
    } as any);

    render(<App />);

    const button = screen.getByRole("button", {
      name: /stop recording/i,
    });

    await user.click(button);
    expect(mockPause).toHaveBeenCalledTimes(1);
  });

  it("should disable button when parsing command", () => {
    vi.mocked(useCommandParser).mockReturnValue({
      parseCommand: vi.fn(),
      isLoading: true,
      lastCommand: null,
    });

    vi.mocked(useMicVAD).mockReturnValue({
      listening: false,
      userSpeaking: false,
      start: mockStart,
      pause: mockPause,
    } as any);

    render(<App />);

    const button = screen.getByRole("button", {
      name: /start recording/i,
    });
    expect(button).toBeDisabled();
  });

  it("should show loading indicator when parsing command", () => {
    vi.mocked(useCommandParser).mockReturnValue({
      parseCommand: vi.fn(),
      isLoading: true,
      lastCommand: null,
    });

    vi.mocked(useMicVAD).mockReturnValue({
      listening: false,
      userSpeaking: false,
      start: mockStart,
      pause: mockPause,
    } as any);

    render(<App />);

    expect(screen.getByText("正在解析指令...")).toBeInTheDocument();
  });

  it("should not show loading indicator when not parsing", () => {
    vi.mocked(useCommandParser).mockReturnValue({
      parseCommand: vi.fn(),
      isLoading: false,
      lastCommand: null,
    });

    vi.mocked(useMicVAD).mockReturnValue({
      listening: false,
      userSpeaking: false,
      start: mockStart,
      pause: mockPause,
    } as any);

    render(<App />);

    expect(screen.queryByText("正在解析指令...")).not.toBeInTheDocument();
  });
});

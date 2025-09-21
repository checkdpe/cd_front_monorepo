import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { Button } from "./src/Button";

describe("@acme/button", () => {
  it("renders label", () => {
    render(<Button label="Hello" />);
    expect(screen.getByRole("button", { name: "Hello" })).toBeInTheDocument();
  });
  it("fires onClick when enabled", () => {
    const fn = vi.fn();
    render(<Button label="Go" onClick={fn} />);
    fireEvent.click(screen.getByRole("button", { name: "Go" }));
    expect(fn).toHaveBeenCalled();
  });
  it("does not fire onClick when disabled", () => {
    const fn = vi.fn();
    render(<Button label="Go" onClick={fn} disabled />);
    fireEvent.click(screen.getByRole("button", { name: "Go" }));
    expect(fn).not.toHaveBeenCalled();
  });
});

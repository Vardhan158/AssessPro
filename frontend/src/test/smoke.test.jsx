import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import Login from "../pages/Login";

vi.mock("../hooks/useAuth", () => ({
  useAuth: () => ({ login: vi.fn() }),
}));

describe("frontend smoke rendering", () => {
  it("renders the login form without a backend request", () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    expect(screen.getByText("Student Assessment Portal")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });
});

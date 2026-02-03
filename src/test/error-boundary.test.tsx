import { render, screen, waitFor } from "@testing-library/react";
import { ErrorBoundary } from "@/components/shared";

describe("ErrorBoundary", () => {
  it("renders a fallback when a child throws", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const Boom = () => {s
      throw new Error("boom");
<<<<<<< HEAD
    };ß
=======
    };
>>>>>>> 8b9e0b808954a4241c89521f409b2eb24024089b

    render(
      <ErrorBoundary fallback={<div>fallback</div>}>
        <Boom />
      </ErrorBoundary>,
    );

    expect(screen.getByText("fallback")).toBeInTheDocument();

    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it("resets when resetKeys change", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const MaybeBoom = ({ shouldThrow }: { shouldThrow: boolean }) => {
      if (shouldThrow) throw new Error("boom");
      return <div>ok</div>;
    };

    const { rerender } = render(
      <ErrorBoundary fallback={<div>fallback</div>} resetKeys={[0]}>
        <MaybeBoom shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(screen.getByText("fallback")).toBeInTheDocument();

    rerender(
      <ErrorBoundary fallback={<div>fallback</div>} resetKeys={[1]}>
        <MaybeBoom shouldThrow={false} />
      </ErrorBoundary>,
    );

    await waitFor(() => expect(screen.getByText("ok")).toBeInTheDocument());

    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });
});


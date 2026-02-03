import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "@/pages/Index";

vi.mock("framer-motion", () => {
  const Motion = new Proxy(
    {},
    {
      get: () =>
        function MotionComponent({ children, ...props }: { children?: React.ReactNode }) {
          const {
            whileHover,
            whileTap,
            whileInView,
            initial,
            animate,
            exit,
            transition,
            layout,
            ...rest
          } = props as Record<string, unknown>;
          return <div {...rest}>{children}</div>;
        },
    }
  );
  return {
    motion: Motion,
    useScroll: () => ({ scrollY: { onChange: () => {}, get: () => 0 } }),
    useTransform: () => "none",
  };
});

describe("Home route", () => {
  it("renders the landing page content", () => {
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={["/"]}>
          <Index />
        </MemoryRouter>
      </AuthProvider>
    );
    expect(screen.getAllByText("Clade").length).toBeGreaterThan(0);
  });
});

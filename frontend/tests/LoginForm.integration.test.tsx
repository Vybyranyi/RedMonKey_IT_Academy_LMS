import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginForm } from "@/components/features/auth/LoginForm";

// Інтеграція LoginForm + Formik + Zod (validateWithZod) — перевіряємо, що форма
// сама не пускає невалідні дані далі, і що валідні дані доходять до onSubmit.
describe("LoginForm", () => {
  it("показує помилки валідації і не викликає onSubmit з порожніми полями", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<LoginForm onSubmit={onSubmit} />);

    await user.click(screen.getByRole("button", { name: /увійти/i }));

    // Порожній email провалює одразу дві перевірки схеми (min і email) — Zod
    // повертає обидва issue, а validateWithZod лишає в polі останнє повідомлення.
    expect(await screen.findByText("Некоректний формат email")).toBeInTheDocument();
    expect(screen.getByText(/пароль має містити не менше 6 символів/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("викликає onSubmit з введеними значеннями, коли форма валідна", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(<LoginForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/email/i), "admin@academy.com");
    await user.type(screen.getByLabelText(/пароль/i), "Password123");
    await user.click(screen.getByRole("button", { name: /увійти/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const [values] = onSubmit.mock.calls[0];
    expect(values).toEqual({ email: "admin@academy.com", password: "Password123" });
  });
});

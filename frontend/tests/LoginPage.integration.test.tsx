import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import LoginPage from "@/pages/LoginPage";
import axiosInstance from "@/api/axios";
import { useAuthStore } from "@/store/authStore";

// axiosInstance — єдина точка виходу в мережу зі сторінки, мокаємо саме її,
// щоб перевірити реальну інтеграцію LoginForm → Zod-валідація → axios → authStore.
vi.mock("@/api/axios", () => ({
  default: { post: vi.fn() },
}));

const mockedPost = vi.mocked(axiosInstance.post);

describe("LoginPage", () => {
  beforeEach(() => {
    mockedPost.mockReset();
    useAuthStore.getState().clearAuth();
  });

  it("зберігає токен і користувача в authStore після успішного логіну", async () => {
    const user = userEvent.setup();
    const fakeUser = { id: "1", firstName: "Іван", lastName: "Франко", email: "ivan@academy.com", role: "STUDENT" };
    mockedPost.mockResolvedValue({ data: { accessToken: "fake-access-token", user: fakeUser } });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText(/email/i), "ivan@academy.com");
    await user.type(screen.getByLabelText(/пароль/i), "Password123");
    await user.click(screen.getByRole("button", { name: /увійти/i }));

    await waitFor(() => {
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });
    expect(useAuthStore.getState().accessToken).toBe("fake-access-token");
    expect(useAuthStore.getState().user).toEqual(fakeUser);
    expect(mockedPost).toHaveBeenCalledWith("/auth/login", {
      email: "ivan@academy.com",
      password: "Password123",
    });
  });

  it("показує повідомлення сервера і не логінить користувача при невірному паролі", async () => {
    const user = userEvent.setup();
    mockedPost.mockRejectedValue({
      isAxiosError: true,
      response: { data: { message: "Невірний email або пароль" } },
    });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText(/email/i), "ivan@academy.com");
    await user.type(screen.getByLabelText(/пароль/i), "WrongPass123");
    await user.click(screen.getByRole("button", { name: /увійти/i }));

    expect(await screen.findByText("Невірний email або пароль")).toBeInTheDocument();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});

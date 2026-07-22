import { apiRequest } from "@/lib/api/client";
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  UserInfo,
} from "@/lib/api/types";

export const authApi = {
  register(payload: RegisterRequest) {
    return apiRequest<UserInfo>("/api/v1/auth/register", {
      method: "POST",
      body: payload,
      auth: false,
    });
  },

  login(payload: LoginRequest) {
    return apiRequest<LoginResponse>("/api/v1/auth/login", {
      method: "POST",
      body: payload,
      auth: false,
    });
  },

  me(token?: string) {
    return apiRequest<UserInfo>("/api/v1/me", {
      token,
    });
  },
};

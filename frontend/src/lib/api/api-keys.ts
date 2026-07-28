import { apiRequest } from "@/lib/api/client";
import type { CreateUserAPIKeyRequest, UserAPIKeyInfo } from "@/lib/api/types";

type UserAPIKeyListResponse = {
  keys: UserAPIKeyInfo[];
};

type UserAPIKeyCreateResponse = UserAPIKeyInfo & {
  key: string;
};

export const apiKeysApi = {
  list() {
    return apiRequest<UserAPIKeyListResponse>("/api/v1/auth/api-keys");
  },

  create(payload: CreateUserAPIKeyRequest) {
    return apiRequest<UserAPIKeyCreateResponse>("/api/v1/auth/api-keys", {
      method: "POST",
      body: payload,
    });
  },

  revoke(keyId: string) {
    return apiRequest<null>(`/api/v1/auth/api-keys/${keyId}`, {
      method: "DELETE",
    });
  },
};

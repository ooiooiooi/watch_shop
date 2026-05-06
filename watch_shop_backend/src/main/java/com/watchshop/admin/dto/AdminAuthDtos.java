package com.watchshop.admin.dto;

import jakarta.validation.constraints.NotBlank;

public final class AdminAuthDtos {
  private AdminAuthDtos() {}

  public record LoginRequest(
      @NotBlank(message = "用户名不能为空") String username,
      @NotBlank(message = "密码不能为空") String password
  ) {}

  public record LoginResponse(String token, String username, boolean mustChangePassword) {}

  public record ChangePasswordRequest(
      @NotBlank(message = "旧密码不能为空") String oldPassword,
      @NotBlank(message = "新密码不能为空") String newPassword
  ) {}
}

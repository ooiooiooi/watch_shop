package com.watchshop.admin;

import com.watchshop.admin.dto.AdminAuthDtos.ChangePasswordRequest;
import com.watchshop.admin.dto.AdminAuthDtos.LoginRequest;
import com.watchshop.admin.dto.AdminAuthDtos.LoginResponse;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/auth")
public class AdminAuthController {
  private final AdminAuthService adminAuthService;

  public AdminAuthController(AdminAuthService adminAuthService) {
    this.adminAuthService = adminAuthService;
  }

  @PostMapping("/login")
  public LoginResponse login(@Valid @RequestBody LoginRequest req) {
    String token = adminAuthService.login(req.username(), req.password());
    return new LoginResponse(token, req.username(), adminAuthService.mustChangePassword(req.username()));
  }

  @PostMapping("/change-password")
  public void changePassword(@Valid @RequestBody ChangePasswordRequest req, Authentication authentication) {
    String username = authentication == null ? null : String.valueOf(authentication.getPrincipal());
    adminAuthService.changePassword(username, req.oldPassword(), req.newPassword());
  }
}

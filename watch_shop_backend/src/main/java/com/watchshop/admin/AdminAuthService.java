package com.watchshop.admin;

import com.watchshop.common.ApiException;
import com.watchshop.security.JwtService;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AdminAuthService {
  private final AdminUserRepository adminUserRepository;
  private final PasswordEncoder passwordEncoder;
  private final JwtService jwtService;

  public AdminAuthService(AdminUserRepository adminUserRepository, PasswordEncoder passwordEncoder, JwtService jwtService) {
    this.adminUserRepository = adminUserRepository;
    this.passwordEncoder = passwordEncoder;
    this.jwtService = jwtService;
  }

  public String login(String username, String password) {
    AdminUserEntity user = adminUserRepository.findByUsername(username)
        .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "账号或密码错误"));
    if (!passwordEncoder.matches(password, user.getPasswordHash())) {
      throw new ApiException(HttpStatus.UNAUTHORIZED, "账号或密码错误");
    }
    return jwtService.issueAdminToken(user.getUsername());
  }

  public boolean mustChangePassword(String username) {
    return adminUserRepository.findByUsername(username).map(AdminUserEntity::isPasswordTemporary).orElse(false);
  }

  public void changePassword(String username, String oldPassword, String newPassword) {
    AdminUserEntity user = adminUserRepository.findByUsername(username)
        .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "登录已失效"));
    if (!passwordEncoder.matches(oldPassword, user.getPasswordHash())) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "旧密码错误");
    }

    String next = newPassword == null ? "" : newPassword.trim();
    if (next.length() < 8) throw new ApiException(HttpStatus.BAD_REQUEST, "新密码长度至少 8 位");
    if (next.length() > 72) throw new ApiException(HttpStatus.BAD_REQUEST, "新密码过长");
    if (passwordEncoder.matches(next, user.getPasswordHash())) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "新密码不能与旧密码相同");
    }

    user.setPasswordHash(passwordEncoder.encode(next));
    user.setPasswordTemporary(false);
    adminUserRepository.save(user);
  }
}

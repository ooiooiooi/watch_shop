package com.watchshop.admin;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import com.watchshop.common.ApiException;

@RestController
@RequestMapping("/api/admin/upload")
public class UploadController {

  private final Path uploadDir = Paths.get("uploads").toAbsolutePath().normalize();

  public UploadController() {
    try {
      Files.createDirectories(uploadDir);
    } catch (Exception ex) {
      throw new RuntimeException("Could not create upload directory.", ex);
    }
  }

  @PostMapping
  public ResponseEntity<Map<String, String>> uploadFile(@RequestParam("file") MultipartFile file) {
    if (file.isEmpty()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "请选择要上传的文件");
    }

    String originalFilename = file.getOriginalFilename();
    String extension = "";
    if (originalFilename != null && originalFilename.contains(".")) {
      extension = originalFilename.substring(originalFilename.lastIndexOf(".")).toLowerCase();
    }
    
    // Only allow specific extensions if needed, but for now allow typical images
    if (!extension.matches("\\.(png|jpe?g|gif|webp|svg)")) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "仅支持 png, jpg, jpeg, gif, webp, svg 格式的图片");
    }

    String newFilename = UUID.randomUUID().toString() + extension;
    Path targetLocation = uploadDir.resolve(newFilename);

    try {
      Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);
    } catch (IOException ex) {
      throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "文件存储失败");
    }

    // Expose uploads under /api/uploads so both dev proxy and production reverse proxy can serve them.
    String url = "/api/uploads/" + newFilename;
    return ResponseEntity.ok(Map.of("url", url));
  }
}

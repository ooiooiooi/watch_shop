package com.watchshop.common;

import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {
  private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

  @ExceptionHandler(ApiException.class)
  public ResponseEntity<ApiError> handleApi(ApiException ex, HttpServletRequest request) {
    return toResponse(ex.getStatus(), ex.getMessage(), request.getRequestURI());
  }

  @ExceptionHandler({MethodArgumentNotValidException.class, BindException.class})
  public ResponseEntity<ApiError> handleValidation(Exception ex, HttpServletRequest request) {
    String message;
    if (ex instanceof MethodArgumentNotValidException manv) {
      message = manv.getBindingResult().getAllErrors().stream().findFirst().map(e -> e.getDefaultMessage()).orElse("参数校验失败");
    } else if (ex instanceof BindException be) {
      message = be.getBindingResult().getAllErrors().stream().findFirst().map(e -> e.getDefaultMessage()).orElse("参数校验失败");
    } else {
      message = "参数校验失败";
    }
    return toResponse(HttpStatus.BAD_REQUEST, message, request.getRequestURI());
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<ApiError> handleAny(Exception ex, HttpServletRequest request) {
    log.error("Unhandled error: {} {}", request.getMethod(), request.getRequestURI(), ex);
    return toResponse(HttpStatus.INTERNAL_SERVER_ERROR, "服务器内部错误", request.getRequestURI());
  }

  private static ResponseEntity<ApiError> toResponse(HttpStatus status, String message, String path) {
    ApiError body = new ApiError(Instant.now(), status.value(), status.getReasonPhrase(), message, path);
    return ResponseEntity.status(status).body(body);
  }
}

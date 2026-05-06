package com.watchshop.catalog;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

final class JsonUtils {
  static final ObjectMapper MAPPER = new ObjectMapper();

  private JsonUtils() {}

  static String write(Object value) {
    try {
      return MAPPER.writeValueAsString(value);
    } catch (JsonProcessingException e) {
      throw new IllegalStateException(e);
    }
  }

  static <T> T read(String value, com.fasterxml.jackson.core.type.TypeReference<T> type) {
    try {
      // H2 in MySQL-compat mode may double-encode JSON as a quoted string
      String v = value.trim();
      if (v.length() >= 2 && v.startsWith("\"") && v.endsWith("\"")) {
        v = MAPPER.readValue(v, String.class);
      }
      return MAPPER.readValue(v, type);
    } catch (Exception e) {
      throw new IllegalStateException(e);
    }
  }
}


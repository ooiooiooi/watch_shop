package com.watchshop.catalog;

import com.fasterxml.jackson.core.type.TypeReference;
import com.watchshop.catalog.dto.CatalogDtos.ProductSkuDto;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import java.util.ArrayList;
import java.util.List;

@Converter
public class ProductSkuListJsonConverter implements AttributeConverter<List<ProductSkuDto>, String> {
  private static final TypeReference<List<ProductSkuDto>> TYPE = new TypeReference<>() {};

  @Override
  public String convertToDatabaseColumn(List<ProductSkuDto> attribute) {
    if (attribute == null) return "[]";
    return JsonUtils.write(attribute);
  }

  @Override
  public List<ProductSkuDto> convertToEntityAttribute(String dbData) {
    if (dbData == null || dbData.isBlank()) return new ArrayList<>();
    return JsonUtils.read(dbData, TYPE);
  }
}


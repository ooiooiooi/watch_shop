package com.watchshop.catalog;

import com.fasterxml.jackson.core.type.TypeReference;
import com.watchshop.catalog.dto.CatalogDtos.SpecGroupDto;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import java.util.ArrayList;
import java.util.List;

@Converter
public class SpecGroupListJsonConverter implements AttributeConverter<List<SpecGroupDto>, String> {
  private static final TypeReference<List<SpecGroupDto>> TYPE = new TypeReference<>() {};

  @Override
  public String convertToDatabaseColumn(List<SpecGroupDto> attribute) {
    if (attribute == null) return "[]";
    return JsonUtils.write(attribute);
  }

  @Override
  public List<SpecGroupDto> convertToEntityAttribute(String dbData) {
    if (dbData == null || dbData.isBlank()) return new ArrayList<>();
    return JsonUtils.read(dbData, TYPE);
  }
}


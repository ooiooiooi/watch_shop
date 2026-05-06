package com.watchshop.catalog;

import com.watchshop.catalog.dto.CatalogDtos.ProductSkuDto;
import com.watchshop.catalog.dto.CatalogDtos.SpecGroupDto;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.List;

@Entity
@Table(
    name = "product",
    indexes = {
        @Index(name = "idx_product_status", columnList = "status"),
        @Index(name = "idx_product_category", columnList = "category"),
        @Index(name = "idx_product_status_category", columnList = "status,category"),
        @Index(name = "idx_product_brand", columnList = "brand"),
        @Index(name = "idx_product_model", columnList = "model"),
        @Index(name = "idx_product_brand_id", columnList = "brandId"),
        @Index(name = "idx_product_model_id", columnList = "modelId"),
        @Index(name = "idx_product_created_at", columnList = "createdAt"),
        @Index(name = "idx_product_updated_at", columnList = "updatedAt")
    }
)
public class ProductEntity {
  @Id
  @Column(length = 64)
  private String id;

  @Column(nullable = false, length = 256)
  private String name;

  @Column(length = 128)
  private String brand;

  @Column(length = 64)
  private String brandId;

  @Column(length = 256)
  private String model;

  @Column(length = 64)
  private String modelId;

  @Column(length = 128)
  private String reference;

  @Column(nullable = false, length = 256)
  private String collection;

  @Column(nullable = false)
  private double price;

  private Double originalPrice;

  @Column(nullable = false, length = 1024)
  private String image;

  @Convert(converter = StringListJsonConverter.class)
  @Column(columnDefinition = "text")
  private List<String> images;

  @Column(length = 128)
  private String tag;

  @Column(nullable = false, length = 64)
  private String category;

  @Column(columnDefinition = "TEXT")
  private String description;

  @Column(nullable = false, length = 16)
  private String status = "on";

  @Column(nullable = false)
  private int sortOrder = 0;

  @Column(length = 255)
  private String metaTitle;

  @Column(length = 500)
  private String metaDescription;

  @Column(columnDefinition = "JSON")
  @Convert(converter = SpecGroupListJsonConverter.class)
  private List<SpecGroupDto> specGroups;

  @Convert(converter = ProductSkuListJsonConverter.class)
  @Column(nullable = false, columnDefinition = "text")
  private List<ProductSkuDto> skus;

  private Instant createdAt;

  private Instant updatedAt;

  @PrePersist
  void onCreate() {
    Instant now = Instant.now();
    if (createdAt == null) createdAt = now;
    updatedAt = now;
  }

  @PreUpdate
  void onUpdate() {
    updatedAt = Instant.now();
  }

  public String getId() {
    return id;
  }

  public void setId(String id) {
    this.id = id;
  }

  public String getName() {
    return name;
  }

  public void setName(String name) {
    this.name = name;
  }

  public String getBrand() {
    return brand;
  }

  public void setBrand(String brand) {
    this.brand = brand;
  }

  public String getBrandId() {
    return brandId;
  }

  public void setBrandId(String brandId) {
    this.brandId = brandId;
  }

  public String getModel() {
    return model;
  }

  public void setModel(String model) {
    this.model = model;
  }

  public String getModelId() {
    return modelId;
  }

  public void setModelId(String modelId) {
    this.modelId = modelId;
  }

  public String getReference() {
    return reference;
  }

  public void setReference(String reference) {
    this.reference = reference;
  }

  public String getCollection() {
    return collection;
  }

  public void setCollection(String collection) {
    this.collection = collection;
  }

  public double getPrice() {
    return price;
  }

  public void setPrice(double price) {
    this.price = price;
  }

  public Double getOriginalPrice() {
    return originalPrice;
  }

  public void setOriginalPrice(Double originalPrice) {
    this.originalPrice = originalPrice;
  }

  public String getImage() {
    return image;
  }

  public void setImage(String image) {
    this.image = image;
  }

  public List<String> getImages() {
    return images;
  }

  public void setImages(List<String> images) {
    this.images = images;
  }

  public String getTag() {
    return tag;
  }

  public void setTag(String tag) {
    this.tag = tag;
  }

  public String getCategory() {
    return category;
  }

  public void setCategory(String category) {
    this.category = category;
  }

  public String getDescription() {
    return description;
  }

  public void setDescription(String description) {
    this.description = description;
  }

  public String getStatus() {
    return status;
  }

  public void setStatus(String status) {
    this.status = status;
  }

  public int getSortOrder() {
    return sortOrder;
  }

  public void setSortOrder(int sortOrder) {
    this.sortOrder = sortOrder;
  }

  public String getMetaTitle() {
    return metaTitle;
  }

  public void setMetaTitle(String metaTitle) {
    this.metaTitle = metaTitle;
  }

  public String getMetaDescription() {
    return metaDescription;
  }

  public void setMetaDescription(String metaDescription) {
    this.metaDescription = metaDescription;
  }

  public List<SpecGroupDto> getSpecGroups() {
    return specGroups;
  }

  public void setSpecGroups(List<SpecGroupDto> specGroups) {
    this.specGroups = specGroups;
  }

  public List<ProductSkuDto> getSkus() {
    return skus;
  }

  public void setSkus(List<ProductSkuDto> skus) {
    this.skus = skus;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(Instant createdAt) {
    this.createdAt = createdAt;
  }

  public Instant getUpdatedAt() {
    return updatedAt;
  }

  public void setUpdatedAt(Instant updatedAt) {
    this.updatedAt = updatedAt;
  }
}

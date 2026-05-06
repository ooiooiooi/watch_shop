package com.watchshop.catalog;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;

@Entity
@Table(
    name = "watch_model",
    indexes = {
        @Index(name = "idx_watch_model_brand_id", columnList = "brandId")
    }
)
public class WatchModelEntity {
  @Id
  @Column(length = 64)
  private String id;

  @Column(nullable = false, length = 64)
  private String brandId;

  @Column(nullable = false, length = 128)
  private String name;

  @Column(length = 1024)
  private String image;

  public String getId() {
    return id;
  }

  public void setId(String id) {
    this.id = id;
  }

  public String getBrandId() {
    return brandId;
  }

  public void setBrandId(String brandId) {
    this.brandId = brandId;
  }

  public String getName() {
    return name;
  }

  public void setName(String name) {
    this.name = name;
  }

  public String getImage() {
    return image;
  }

  public void setImage(String image) {
    this.image = image;
  }
}

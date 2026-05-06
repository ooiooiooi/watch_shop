package com.watchshop.catalog;

import com.watchshop.catalog.dto.CatalogDtos.CategoryDto;
import com.watchshop.catalog.dto.CatalogDtos.ProductDto;
import com.watchshop.catalog.dto.CatalogDtos.ProductSkuDto;
import com.watchshop.catalog.dto.CatalogDtos.SpecGroupDto;
import com.watchshop.catalog.dto.TaxonomyDtos.BrandDto;
import com.watchshop.catalog.dto.TaxonomyDtos.ModelDto;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class SeedData {
  private static final String CHRONOGRAPH_IMAGE = "https://images.unsplash.com/photo-1611353384046-8a02bac0f14d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlbGVnYW50JTIwY2hyb25vZ3JhcGglMjB3YXRjaHxlbnwxfHx8fDE3NzYxNzMxMTZ8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral";
  private static final String GOLD_FACE_IMAGE = "https://images.unsplash.com/photo-1772793384358-27b46e587bee?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxnb2xkJTIwd2F0Y2glMjBmYWNlJTIwbWFjcm98ZW58MXx8fHwxNzc2MTczMTE4fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral";
  private static final String SPORT_IMAGE = "https://images.unsplash.com/photo-1700650109006-1741e917a6bf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzcG9ydCUyMGRpdmluZyUyMHdhdGNoJTIwc3RlZWx8ZW58MXx8fHwxNzc2MTczMTE5fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral";
  private static final String MINIMAL_IMAGE = "https://images.unsplash.com/photo-1758887952896-8491d393afe2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtaW5pbWFsaXN0JTIwd2F0Y2glMjB3aGl0ZSUyMGRpYWx8ZW58MXx8fHwxNzc2MTczMTE3fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral";
  private static final String LEATHER_IMAGE = "https://images.unsplash.com/photo-1769240186303-d7fb5cf4a8be?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcmVtaXVtJTIwd2F0Y2glMjBsZWF0aGVyJTIwc3RyYXB8ZW58MXx8fHwxNzc2MTczMTE4fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral";
  private static final String MECHANISM_IMAGE = "https://images.unsplash.com/photo-1763226015334-9a2d3fb11ea5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBhdXRvbWF0aWMlMjB3YXRjaCUyMG1lY2hhbmlzbXxlbnwxfHx8fDE3NzYxNzMxMTh8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral";

  public List<CategoryDto> seedCategories() {
    return List.of(
        new CategoryDto("chronograph", "Chronograph", CHRONOGRAPH_IMAGE),
        new CategoryDto("classic", "Classic", GOLD_FACE_IMAGE),
        new CategoryDto("sport", "Sport", SPORT_IMAGE),
        new CategoryDto("minimal", "Minimalist", MINIMAL_IMAGE)
    );
  }

  public List<ProductDto> seedProducts() {
    java.util.ArrayList<ProductDto> list = new java.util.ArrayList<>();

    list.add(new ProductDto(
        "1",
        "Royal Chronograph",
        "Rolex",
        "Daytona",
        "116505",
        "Heritage Collection",
        12800.0,
        15600.0,
        CHRONOGRAPH_IMAGE,
        "Best Seller",
        "chronograph",
        "A masterpiece of Swiss engineering, the Royal Chronograph combines timeless elegance with precision mechanics. Featuring a 42mm rose gold case, sapphire crystal, and an automatic movement with 72-hour power reserve.",
        "on",
        List.of(
            new SpecGroupDto("Color", List.of("Rose Gold", "Silver", "Black")),
            new SpecGroupDto("Case Size", List.of("38mm", "40mm", "42mm"))
        ),
        List.of(
            new ProductSkuDto("1-rg-38", Map.of("Color", "Rose Gold", "Case Size", "38mm"), 12800.0, 15600.0, 6, true),
            new ProductSkuDto("1-rg-40", Map.of("Color", "Rose Gold", "Case Size", "40mm"), 12800.0, 15600.0, 10, true),
            new ProductSkuDto("1-rg-42", Map.of("Color", "Rose Gold", "Case Size", "42mm"), 13200.0, 15600.0, 4, true),
            new ProductSkuDto("1-s-38", Map.of("Color", "Silver", "Case Size", "38mm"), 12400.0, 14800.0, 3, true),
            new ProductSkuDto("1-s-40", Map.of("Color", "Silver", "Case Size", "40mm"), 12400.0, 14800.0, 0, true),
            new ProductSkuDto("1-s-42", Map.of("Color", "Silver", "Case Size", "42mm"), 12900.0, 14800.0, 2, true),
            new ProductSkuDto("1-b-38", Map.of("Color", "Black", "Case Size", "38mm"), 12100.0, 14500.0, 1, true),
            new ProductSkuDto("1-b-40", Map.of("Color", "Black", "Case Size", "40mm"), 12100.0, 14500.0, 5, true),
            new ProductSkuDto("1-b-42", Map.of("Color", "Black", "Case Size", "42mm"), 12600.0, 14500.0, 0, false)
        )
    ));

    list.add(new ProductDto(
        "2",
        "Midnight Gold",
        "Patek Philippe",
        "Nautilus",
        "5711/1A",
        "Signature Series",
        9600.0,
        null,
        GOLD_FACE_IMAGE,
        null,
        "classic",
        "Crafted from 18k gold with a deep midnight dial, this timepiece embodies understated luxury. The sunray-finished dial catches light from every angle.",
        "on",
        List.of(
            new SpecGroupDto("Strap", List.of("Leather", "Metal")),
            new SpecGroupDto("Case Size", List.of("38mm", "40mm"))
        ),
        List.of(
            new ProductSkuDto("2-l-38", Map.of("Strap", "Leather", "Case Size", "38mm"), 9600.0, null, 12, true),
            new ProductSkuDto("2-l-40", Map.of("Strap", "Leather", "Case Size", "40mm"), 9800.0, null, 7, true),
            new ProductSkuDto("2-m-38", Map.of("Strap", "Metal", "Case Size", "38mm"), 10200.0, null, 2, true),
            new ProductSkuDto("2-m-40", Map.of("Strap", "Metal", "Case Size", "40mm"), 10400.0, null, 0, true)
        )
    ));

    list.add(new ProductDto(
        "3",
        "Ocean Master",
        "Audemars Piguet",
        "Royal Oak Offshore",
        "26400SO",
        "Sport Line",
        7800.0,
        8900.0,
        SPORT_IMAGE,
        "Limited",
        "sport",
        "Engineered for the depths, water-resistant to 300m. Features a unidirectional rotating bezel, luminescent markers, and a titanium case.",
        "on",
        List.of(
            new SpecGroupDto("Dial", List.of("Black", "Blue")),
            new SpecGroupDto("Case Size", List.of("40mm", "42mm"))
        ),
        List.of(
            new ProductSkuDto("3-bk-40", Map.of("Dial", "Black", "Case Size", "40mm"), 7800.0, 8900.0, 5, true),
            new ProductSkuDto("3-bk-42", Map.of("Dial", "Black", "Case Size", "42mm"), 8100.0, 8900.0, 3, true),
            new ProductSkuDto("3-bl-40", Map.of("Dial", "Blue", "Case Size", "40mm"), 7900.0, 8900.0, 0, true),
            new ProductSkuDto("3-bl-42", Map.of("Dial", "Blue", "Case Size", "42mm"), 8200.0, 8900.0, 1, true)
        )
    ));

    list.add(new ProductDto(
        "4",
        "Elegance Pure",
        "Cartier",
        "Santos",
        "WSSA0030",
        "Minimalist",
        5200.0,
        null,
        MINIMAL_IMAGE,
        null,
        "minimal",
        "Less is more. The Elegance Pure features an ultra-thin 7mm profile, a pristine white dial, and a refined mesh bracelet.",
        "off",
        List.of(
            new SpecGroupDto("Case Size", List.of("38mm", "40mm"))
        ),
        List.of(
            new ProductSkuDto("4-38", Map.of("Case Size", "38mm"), 5200.0, null, 8, true),
            new ProductSkuDto("4-40", Map.of("Case Size", "40mm"), 5400.0, null, 5, true)
        )
    ));

    list.add(new ProductDto(
        "5",
        "Heritage Leather",
        "Omega",
        "Seamaster",
        "210.30.42.20.01.001",
        "Classic",
        6800.0,
        null,
        LEATHER_IMAGE,
        "New",
        "classic",
        "Handcrafted Italian leather strap paired with a polished steel case. The Heritage Leather is a tribute to traditional watchmaking.",
        "on",
        List.of(
            new SpecGroupDto("Color", List.of("Brown", "Black")),
            new SpecGroupDto("Case Size", List.of("38mm", "40mm"))
        ),
        List.of(
            new ProductSkuDto("5-br-38", Map.of("Color", "Brown", "Case Size", "38mm"), 6800.0, null, 9, true),
            new ProductSkuDto("5-br-40", Map.of("Color", "Brown", "Case Size", "40mm"), 7000.0, null, 4, true),
            new ProductSkuDto("5-bk-38", Map.of("Color", "Black", "Case Size", "38mm"), 6800.0, null, 2, true),
            new ProductSkuDto("5-bk-40", Map.of("Color", "Black", "Case Size", "40mm"), 7000.0, null, 0, true)
        )
    ));

    list.add(new ProductDto(
        "6",
        "Tourbillon Skeleton",
        "Richard Mille",
        "RM 11-03",
        "RM11-03",
        "Haute Horlogerie",
        28500.0,
        null,
        MECHANISM_IMAGE,
        "Exclusive",
        "chronograph",
        "The pinnacle of our craft. A hand-finished tourbillon movement visible through the skeleton dial, housed in a platinum case.",
        "on",
        List.of(
            new SpecGroupDto("Case", List.of("Platinum", "Rose Gold")),
            new SpecGroupDto("Strap", List.of("Rubber", "Leather"))
        ),
        List.of(
            new ProductSkuDto("6-p-r", Map.of("Case", "Platinum", "Strap", "Rubber"), 28500.0, null, 2, true),
            new ProductSkuDto("6-p-l", Map.of("Case", "Platinum", "Strap", "Leather"), 29200.0, null, 1, true),
            new ProductSkuDto("6-r-r", Map.of("Case", "Rose Gold", "Strap", "Rubber"), 27600.0, null, 0, true),
            new ProductSkuDto("6-r-l", Map.of("Case", "Rose Gold", "Strap", "Leather"), 28400.0, null, 1, true)
        )
    ));

    list.add(new ProductDto(
        "7",
        "Submariner Date Black",
        "Rolex",
        "Submariner",
        "126610LN",
        "Diver Series",
        13900.0,
        null,
        SPORT_IMAGE,
        "Iconic",
        "sport",
        "A modern dive icon with a ceramic bezel and classic black dial, balancing rugged capability with timeless design.",
        "on",
        List.of(
            new SpecGroupDto("Dial", List.of("Black")),
            new SpecGroupDto("Bracelet", List.of("Oyster"))
        ),
        List.of(
            new ProductSkuDto("7-bk-oyster", Map.of("Dial", "Black", "Bracelet", "Oyster"), 13900.0, null, 8, true)
        )
    ));

    list.add(new ProductDto(
        "8",
        "GMT-Master II Pepsi",
        "Rolex",
        "GMT-Master II",
        "126710BLRO",
        "Travel Line",
        15400.0,
        16900.0,
        SPORT_IMAGE,
        "Best Seller",
        "sport",
        "The legendary dual-time traveler with the unmistakable red and blue bezel.",
        "on",
        List.of(
            new SpecGroupDto("Bracelet", List.of("Jubilee", "Oyster"))
        ),
        List.of(
            new ProductSkuDto("8-jubilee", Map.of("Bracelet", "Jubilee"), 15400.0, 16900.0, 4, true),
            new ProductSkuDto("8-oyster", Map.of("Bracelet", "Oyster"), 15200.0, 16900.0, 2, true)
        )
    ));

    list.add(new ProductDto(
        "9",
        "Aquanaut Khaki Green",
        "Patek Philippe",
        "Aquanaut",
        "5168G-010",
        "Aquatic Luxury",
        26500.0,
        null,
        GOLD_FACE_IMAGE,
        "Rare",
        "classic",
        "A contemporary Patek profile with a sporty strap and vivid dial tone.",
        "on",
        List.of(
            new SpecGroupDto("Strap", List.of("Rubber")),
            new SpecGroupDto("Dial", List.of("Khaki Green"))
        ),
        List.of(
            new ProductSkuDto("9-green-rubber", Map.of("Strap", "Rubber", "Dial", "Khaki Green"), 26500.0, null, 1, true)
        )
    ));

    list.add(new ProductDto(
        "10",
        "Royal Oak Jumbo Blue",
        "Audemars Piguet",
        "Royal Oak",
        "16202ST",
        "Royal Oak Collection",
        29800.0,
        null,
        CHRONOGRAPH_IMAGE,
        "Collector",
        "classic",
        "The ultra-thin legend with a blue dial and unmistakable octagonal bezel.",
        "on",
        List.of(
            new SpecGroupDto("Dial", List.of("Blue")),
            new SpecGroupDto("Bracelet", List.of("Steel"))
        ),
        List.of(
            new ProductSkuDto("10-blue-steel", Map.of("Dial", "Blue", "Bracelet", "Steel"), 29800.0, null, 1, true)
        )
    ));

    list.add(new ProductDto(
        "11",
        "Speedmaster Moonwatch",
        "Omega",
        "Speedmaster",
        "310.30.42.50.01.001",
        "Chronograph Heritage",
        7600.0,
        null,
        CHRONOGRAPH_IMAGE,
        null,
        "chronograph",
        "A chronograph legend with a storied history and unmistakable tachymeter bezel.",
        "on",
        List.of(
            new SpecGroupDto("Strap", List.of("Steel", "Leather"))
        ),
        List.of(
            new ProductSkuDto("11-steel", Map.of("Strap", "Steel"), 7600.0, null, 6, true),
            new ProductSkuDto("11-leather", Map.of("Strap", "Leather"), 7300.0, null, 3, true)
        )
    ));

    list.add(new ProductDto(
        "12",
        "Cartier Tank Must",
        "Cartier",
        "Tank",
        "WSTA0041",
        "Dress Essentials",
        4200.0,
        null,
        MINIMAL_IMAGE,
        "New",
        "minimal",
        "A refined rectangular icon that pairs effortlessly with any wardrobe.",
        "on",
        List.of(
            new SpecGroupDto("Strap", List.of("Leather")),
            new SpecGroupDto("Dial", List.of("White"))
        ),
        List.of(
            new ProductSkuDto("12-white-leather", Map.of("Strap", "Leather", "Dial", "White"), 4200.0, null, 10, true)
        )
    ));

    list.add(new ProductDto(
        "13",
        "Big Bang Unico",
        "Hublot",
        "Big Bang",
        "441.NX.1171.RX",
        "Modern Sport",
        15800.0,
        null,
        SPORT_IMAGE,
        "Limited",
        "sport",
        "Bold case architecture, contemporary materials, and an energetic presence on the wrist.",
        "on",
        List.of(
            new SpecGroupDto("Strap", List.of("Rubber")),
            new SpecGroupDto("Case", List.of("Titanium"))
        ),
        List.of(
            new ProductSkuDto("13-ti-rubber", Map.of("Strap", "Rubber", "Case", "Titanium"), 15800.0, null, 2, true)
        )
    ));

    list.add(new ProductDto(
        "14",
        "Datejust Fluted Jubilee",
        "Rolex",
        "Datejust",
        "126334",
        "Everyday Classic",
        10200.0,
        null,
        GOLD_FACE_IMAGE,
        "Popular",
        "classic",
        "A versatile classic with a fluted bezel and Jubilee bracelet.",
        "on",
        List.of(
            new SpecGroupDto("Dial", List.of("Blue", "Silver", "Black")),
            new SpecGroupDto("Bracelet", List.of("Jubilee"))
        ),
        List.of(
            new ProductSkuDto("14-blue-jub", Map.of("Dial", "Blue", "Bracelet", "Jubilee"), 10400.0, null, 5, true),
            new ProductSkuDto("14-silver-jub", Map.of("Dial", "Silver", "Bracelet", "Jubilee"), 10200.0, null, 6, true),
            new ProductSkuDto("14-black-jub", Map.of("Dial", "Black", "Bracelet", "Jubilee"), 10200.0, null, 3, true)
        )
    ));

    list.add(new ProductDto(
        "15",
        "Nautilus Blue Dial",
        "Patek Philippe",
        "Nautilus",
        "5712/1A",
        "Icon Series",
        33500.0,
        null,
        GOLD_FACE_IMAGE,
        "Collector",
        "classic",
        "A refined complication within the Nautilus family, with unmistakable elegance.",
        "on",
        List.of(
            new SpecGroupDto("Bracelet", List.of("Steel"))
        ),
        List.of(
            new ProductSkuDto("15-steel", Map.of("Bracelet", "Steel"), 33500.0, null, 1, true)
        )
    ));

    list.add(new ProductDto(
        "16",
        "Royal Oak Chronograph Panda",
        "Audemars Piguet",
        "Royal Oak Chronograph",
        "26331ST",
        "Royal Oak Collection",
        31200.0,
        null,
        CHRONOGRAPH_IMAGE,
        null,
        "chronograph",
        "A sporty chronograph with a high-contrast dial layout and signature finishing.",
        "on",
        List.of(
            new SpecGroupDto("Dial", List.of("Panda")),
            new SpecGroupDto("Bracelet", List.of("Steel"))
        ),
        List.of(
            new ProductSkuDto("16-panda-steel", Map.of("Dial", "Panda", "Bracelet", "Steel"), 31200.0, null, 1, true)
        )
    ));

    list.add(new ProductDto(
        "17",
        "Seamaster Diver 300M Blue",
        "Omega",
        "Seamaster",
        "210.30.42.20.03.001",
        "Diver Series",
        5900.0,
        null,
        SPORT_IMAGE,
        "Best Seller",
        "sport",
        "A modern diver with a wave dial and confident presence, built for everyday wear.",
        "on",
        List.of(
            new SpecGroupDto("Dial", List.of("Blue")),
            new SpecGroupDto("Bracelet", List.of("Steel", "Rubber"))
        ),
        List.of(
            new ProductSkuDto("17-blue-steel", Map.of("Dial", "Blue", "Bracelet", "Steel"), 5900.0, null, 7, true),
            new ProductSkuDto("17-blue-rubber", Map.of("Dial", "Blue", "Bracelet", "Rubber"), 5700.0, null, 4, true)
        )
    ));

    list.add(new ProductDto(
        "18",
        "RM 035 Rafael Nadal",
        "Richard Mille",
        "RM 035",
        "RM035",
        "High-Tech Sport",
        45500.0,
        null,
        MECHANISM_IMAGE,
        "Rare",
        "sport",
        "A featherweight high-tech statement designed for extreme performance.",
        "on",
        List.of(
            new SpecGroupDto("Strap", List.of("Rubber")),
            new SpecGroupDto("Case", List.of("Carbon"))
        ),
        List.of(
            new ProductSkuDto("18-carbon-rubber", Map.of("Strap", "Rubber", "Case", "Carbon"), 45500.0, null, 1, true)
        )
    ));

    list.add(new ProductDto(
        "19",
        "Tudor Black Bay 58",
        "Tudor",
        "Black Bay 58",
        "M79030N-0001",
        "Vintage Diver",
        3800.0,
        null,
        SPORT_IMAGE,
        null,
        "sport",
        "A compact diver with vintage proportions and modern reliability.",
        "on",
        List.of(
            new SpecGroupDto("Bracelet", List.of("Steel", "NATO"))
        ),
        List.of(
            new ProductSkuDto("19-steel", Map.of("Bracelet", "Steel"), 3800.0, null, 12, true),
            new ProductSkuDto("19-nato", Map.of("Bracelet", "NATO"), 3600.0, null, 8, true)
        )
    ));

    list.add(new ProductDto(
        "20",
        "IWC Pilot Chronograph",
        "IWC",
        "Pilot Chronograph",
        "IW377709",
        "Aviation",
        6200.0,
        null,
        CHRONOGRAPH_IMAGE,
        null,
        "chronograph",
        "A robust pilot’s chronograph with legible layout and timeless cockpit spirit.",
        "on",
        List.of(
            new SpecGroupDto("Strap", List.of("Leather", "Steel"))
        ),
        List.of(
            new ProductSkuDto("20-leather", Map.of("Strap", "Leather"), 6200.0, null, 5, true),
            new ProductSkuDto("20-steel", Map.of("Strap", "Steel"), 6500.0, null, 2, true)
        )
    ));

    list.add(new ProductDto(
        "21",
        "Jaeger-LeCoultre Reverso",
        "Jaeger-LeCoultre",
        "Reverso",
        "Q3858522",
        "Art Deco",
        8900.0,
        null,
        MINIMAL_IMAGE,
        null,
        "minimal",
        "An Art Deco icon with a reversible case and elegant lines.",
        "on",
        List.of(
            new SpecGroupDto("Strap", List.of("Leather")),
            new SpecGroupDto("Dial", List.of("Silver"))
        ),
        List.of(
            new ProductSkuDto("21-silver-leather", Map.of("Strap", "Leather", "Dial", "Silver"), 8900.0, null, 2, true)
        )
    ));

    list.add(new ProductDto(
        "22",
        "Rolex Explorer",
        "Rolex",
        "Explorer",
        "124270",
        "Adventure",
        7900.0,
        null,
        SPORT_IMAGE,
        null,
        "sport",
        "A clean, rugged dial and an understated profile built for exploration.",
        "on",
        List.of(
            new SpecGroupDto("Bracelet", List.of("Oyster"))
        ),
        List.of(
            new ProductSkuDto("22-oyster", Map.of("Bracelet", "Oyster"), 7900.0, null, 9, true)
        )
    ));

    list.add(new ProductDto(
        "23",
        "Cartier Ballon Bleu",
        "Cartier",
        "Ballon Bleu",
        "WSBB0040",
        "Dress Essentials",
        6100.0,
        null,
        GOLD_FACE_IMAGE,
        null,
        "classic",
        "A rounded silhouette with a signature crown guard, instantly recognizable.",
        "on",
        List.of(
            new SpecGroupDto("Bracelet", List.of("Steel")),
            new SpecGroupDto("Dial", List.of("Silver"))
        ),
        List.of(
            new ProductSkuDto("23-silver-steel", Map.of("Bracelet", "Steel", "Dial", "Silver"), 6100.0, null, 4, true)
        )
    ));

    list.add(new ProductDto(
        "24",
        "Patek Calatrava",
        "Patek Philippe",
        "Calatrava",
        "6119R-001",
        "Dress Classic",
        24500.0,
        null,
        LEATHER_IMAGE,
        "Classic",
        "classic",
        "Understated elegance in its purest form, with a slim profile and timeless dial.",
        "on",
        List.of(
            new SpecGroupDto("Strap", List.of("Leather")),
            new SpecGroupDto("Case", List.of("Rose Gold"))
        ),
        List.of(
            new ProductSkuDto("24-rg-leather", Map.of("Strap", "Leather", "Case", "Rose Gold"), 24500.0, null, 1, true)
        )
    ));

    list.add(new ProductDto(
        "25",
        "AP Code 11.59 Chronograph",
        "Audemars Piguet",
        "Code 11.59",
        "26393OR",
        "Modern Dress",
        27400.0,
        null,
        CHRONOGRAPH_IMAGE,
        null,
        "chronograph",
        "A modern AP silhouette with refined finishing and strong wrist presence.",
        "on",
        List.of(
            new SpecGroupDto("Strap", List.of("Leather")),
            new SpecGroupDto("Case", List.of("Rose Gold"))
        ),
        List.of(
            new ProductSkuDto("25-rg-leather", Map.of("Strap", "Leather", "Case", "Rose Gold"), 27400.0, null, 1, true)
        )
    ));

    list.add(new ProductDto(
        "26",
        "Omega De Ville Prestige",
        "Omega",
        "De Ville",
        "424.13.40.20.02.003",
        "Dress Classic",
        3400.0,
        null,
        MINIMAL_IMAGE,
        null,
        "minimal",
        "A clean dress watch with a slim profile and classic proportions.",
        "on",
        List.of(
            new SpecGroupDto("Strap", List.of("Leather")),
            new SpecGroupDto("Dial", List.of("Silver"))
        ),
        List.of(
            new ProductSkuDto("26-silver-leather", Map.of("Strap", "Leather", "Dial", "Silver"), 3400.0, null, 14, true)
        )
    ));

    return list;
  }

  public List<BrandDto> seedBrands() {
    java.util.LinkedHashMap<String, BrandDto> map = new java.util.LinkedHashMap<>();
    for (ProductDto p : seedProducts()) {
      if (p.brand() == null || p.brand().isBlank()) continue;
      String id = slug(p.brand());
      map.putIfAbsent(id, new BrandDto(id, p.brand().trim(), p.image()));
    }
    return map.values().stream().sorted(java.util.Comparator.comparing(BrandDto::name)).toList();
  }

  public List<ModelDto> seedModels() {
    java.util.LinkedHashMap<String, ModelDto> map = new java.util.LinkedHashMap<>();
    for (ProductDto p : seedProducts()) {
      if (p.brand() == null || p.brand().isBlank()) continue;
      if (p.model() == null || p.model().isBlank()) continue;
      String brandId = slug(p.brand());
      String id = slug(p.brand() + "-" + p.model());
      map.putIfAbsent(id, new ModelDto(id, brandId, p.model().trim(), p.image()));
    }
    return map.values().stream()
        .sorted(java.util.Comparator.comparing(ModelDto::brandId).thenComparing(ModelDto::name))
        .toList();
  }

  private static String slug(String value) {
    String s = value.trim().toLowerCase(java.util.Locale.ROOT);
    s = s.replaceAll("[^a-z0-9]+", "-");
    s = s.replaceAll("(^-+)|(-+$)", "");
    if (s.isBlank()) return "x";
    if (s.length() > 64) return s.substring(0, 64);
    return s;
  }
}

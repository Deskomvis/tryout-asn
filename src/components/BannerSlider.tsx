import { useRef } from "react";
import Autoplay from "embla-carousel-autoplay";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import banner1 from "@/assets/banner-1.webp";
import banner2 from "@/assets/banner-2.webp";
import banner3 from "@/assets/banner-3.webp";

const banners = [
  { src: banner1, alt: "Lulus CPNS & PPPK Selangkah Lagi" },
  { src: banner2, alt: "Latihan Sekarang Sebelum Terlambat" },
  { src: banner3, alt: "Rahasia Sukses Seleksi ASN" },
];

export const BannerSlider = () => {
  const autoplay = useRef(
    Autoplay({ delay: 3500, stopOnInteraction: false, stopOnMouseEnter: true })
  );

  return (
    <Carousel
      opts={{ loop: true, align: "center", direction: "rtl" }}
      plugins={[autoplay.current]}
      className="w-full"
    >
      <CarouselContent className="-ml-4">
        {banners.map((b, i) => (
          <CarouselItem
            key={i}
            className="pl-4 basis-[85%] sm:basis-[75%] md:basis-[70%] lg:basis-[65%]"
          >
            <div className="overflow-hidden rounded-2xl shadow-elegant">
              <img
                src={b.src}
                alt={b.alt}
                className="h-auto w-full object-cover"
                loading="lazy"
              />
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
    </Carousel>
  );
};

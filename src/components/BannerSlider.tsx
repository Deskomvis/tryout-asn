import { useEffect, useRef, useState } from "react";
import Autoplay from "embla-carousel-autoplay";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";
import banner1 from "@/assets/banner-1.webp";
import banner2 from "@/assets/banner-2.webp";
import banner3 from "@/assets/banner-3.webp";

const banners = [
  { src: banner1, alt: "Lulus CPNS & PPPK Selangkah Lagi" },
  { src: banner2, alt: "Latihan Sekarang Sebelum Terlambat" },
  { src: banner3, alt: "Rahasia Sukses Seleksi ASN" },
];

const repeatedBanners = Array.from({ length: 4 }, () => banners).flat();

export const BannerSlider = () => {
  const autoplay = useRef(
    Autoplay({ delay: 3500, stopOnInteraction: false, stopOnMouseEnter: true })
  );
  const [api, setApi] = useState<CarouselApi>();
  const [selected, setSelected] = useState(0);

  const updateSelected = (carouselApi: CarouselApi) => {
    setSelected(carouselApi.selectedScrollSnap() % banners.length);
  };

  const scrollToBanner = (index: number) => {
    if (!api) return;
    const current = api.selectedScrollSnap();
    const targets = api
      .scrollSnapList()
      .map((_, snapIndex) => snapIndex)
      .filter((snapIndex) => snapIndex % banners.length === index);
    const nearest = targets.reduce((closest, snapIndex) =>
      Math.abs(snapIndex - current) < Math.abs(closest - current) ? snapIndex : closest
    );
    api.scrollTo(nearest);
  };

  useEffect(() => {
    if (!api) return;
    updateSelected(api);
    const onSelect = () => updateSelected(api);
    api.on("select", onSelect);
    api.on("reInit", onSelect);
    return () => {
      api.off("select", onSelect);
      api.off("reInit", onSelect);
    };
  }, [api]);

  return (
    <div className="relative">
      {/* Side blue shadows */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-primary/30 via-primary/10 to-transparent sm:w-24 md:w-32" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-primary/30 via-primary/10 to-transparent sm:w-24 md:w-32" />

      <Carousel
        setApi={setApi}
        opts={{ loop: true, align: "center" }}
        plugins={[autoplay.current]}
        className="w-full"
      >
        <CarouselContent className="-ml-4">
          {repeatedBanners.map((b, i) => (
            <CarouselItem
              key={`${b.alt}-${i}`}
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

        <CarouselPrevious className="!left-4 z-20 hidden md:flex" />
        <CarouselNext className="!right-4 z-20 hidden md:flex" />
      </Carousel>

      {/* Dots */}
      <div className="mt-4 flex items-center justify-center gap-2">
        {banners.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Slide ${i + 1}`}
            onClick={() => scrollToBanner(i)}
            className={cn(
              "h-2 rounded-full transition-all",
              selected === i
                ? "w-6 bg-primary"
                : "w-2 bg-primary/30 hover:bg-primary/50"
            )}
          />
        ))}
      </div>
    </div>
  );
};

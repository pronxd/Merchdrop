export interface ProductSize {
  size: string;
  price: number;
}

export interface StorefrontProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  image: string;
  soldOut?: boolean;
  sizes?: ProductSize[];
}

export interface CartItem extends StorefrontProduct {
  quantity: number;
  selectedSize?: string;
}

export interface YouTubeVideo {
  id: string;
  title: string;
  thumbnail: string;
  duration: string;
  views: string;
  likes: string;
  comments: string;
  date: string;
}

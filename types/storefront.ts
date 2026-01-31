export interface StorefrontProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  image: string;
  soldOut?: boolean;
}

export interface CartItem extends StorefrontProduct {
  quantity: number;
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

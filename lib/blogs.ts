export interface BlogPost {
  id: number;
  slug: string;
  title: string;
  subtitle: string;
  date: string;
  month: string;
  year: string;
  content: string[];
  image?: string;
}

export const blogPosts: BlogPost[] = [
  {
    id: 1,
    slug: "celebrating-winter-warmth-january-2024",
    title: "Celebrating Winter Warmth at Kassy Cakes",
    subtitle: "January 2024",
    date: "January 2024",
    month: "January",
    year: "2024",
    image: "https://kassycakes.b-cdn.net/blue_gold_celestial_night_cake.jpg",
    content: [
      "Step into the new year with Kassy Cakes in 2024! Join me in cherishing the delightful pleasures of baking and the camaraderie of our community. Embracing the chilly Austin weather, my cake selection this season is a delightful combination of comforting flavors, ideal for any get-together.",
      "Drawing inspiration from our vibrant city's culture, every treat at Kassy Cakes is a fusion of local flair. I'm immensely grateful for your enduring patronage and cannot wait to indulge you in more delectable treats and heartening moments.",
      "Let's raise a toast to a year full of scrumptious cakes and heartwarming memories!"
    ]
  },
  {
    id: 2,
    slug: "welcoming-the-holidays-december-2023",
    title: "Welcoming the Holidays",
    subtitle: "December 2023",
    date: "December 2023",
    month: "December",
    year: "2023",
    image: "https://kassycakes.b-cdn.net/blue_gold_floral_wedding_cake.jpg",
    content: [
      "Season's greetings from Kyle, Texas! Kassandra Osorio here, your enthusiastic baker from Kassy Cakes and I am excited to spread some holiday cheer. At the end of another year, I'm very glad to introduce my favorite holiday-inspired bakes right across from celebratory downtown Austin.",
      "During Christmas, Austin is a sight to see with its dazzling lights and joyful celebrations. So, based on this idea I have been designing holiday-style cakes such as a red velvet cake with buttercream snow and colored sprinkles to highlight Austin's cheerful Trail of Lights.",
      "Tasting local flavors has been a pleasure. My latest creation? It is also equipped with a Texas-style pecan praline frosting, which has become an instant hit to our famous pecans.",
      "Looking back at this past year's journey, I am thankful for all the cake decorating lessons and growth. Amongst personal triumphs: a cake designed for the wedding of schoolmates at the Lady Bird Johnson Wildflower Center, to mirror Texas' own natural charms.",
      "Sensational news for the new year- I have a new website, and I am considering holding some baking lessons!? Just right for the novice baker or one who wants to add a creative touch.",
      "Besides baking, my family and I all threw ourselves into the lively activities of Austin--the Trail in Lights was made even more vibrant by a little girl's efforts; and live music is one of our city's claims to fame.",
      "Thank you for coming along on this sweet ride with me. It has been a very satisfying year, and your support the cherry on top. With the arrival of a new year, I wish you all happiness and peace--and cakes with delicious fillings.",
      "Cheers for a happy and prosperous New Year, with more cake-filled escapades to come in 2024."
    ]
  },
  {
    id: 3,
    slug: "my-first-blog-october-2023",
    title: "My First Blog",
    subtitle: "October 2023",
    date: "October 2023",
    month: "October",
    year: "2023",
    image: "https://kassycakes.b-cdn.net/auburn_haired_classical_woman_cake.jpg",
    content: [
      "Hi everyone! Welcome to Kassy Cakes Blogs! My name is Kassandra Osorio and I'm so excited to start this blog sharing my passion for baking cakes. I'm a self-taught baker who specializes in buttercream cake decorating. I currently live in Kyle, Texas, which is only 15 miles south of Austin and 63 miles northeast of San Antonio.",
      "Baking has been a hobby of mine ever since I was a little girl. I have fond memories of baking birthday cakes with my mom and decorating them with tons and tons of sprinkles (yes often too many). As I got older, I wanted to learn more complex cake-decorating techniques so that I could really spoil my friends and family with pretty cakes but I couldn't afford to take expensive cake-decorating classes. So I turned to books, YouTube videos, and LOTS of trial and error to teach myself the art of buttercream cake decorating (and yes sometimes errors are expensive too).",
      "After lots and lots of practice (and many, many failed cakes!), I am happy to report that I can now make buttercream cakes in my own unique decorating style that I can't wait to share with all of you. As a cake designer, I take pride in crafting unique and personalized cakes that add a special touch to any occasion, be it a birthday, wedding, or another memorable event.",
      "On this blog, I'll be posting some cake-related stuff and photos of cakes I've made for clients. My goal is to inspire other home bakers like myself and show you that with enough passion and practice, you can teach yourself any skill! As with all skills and arts, I'm still learning and improving every day, so this will be an ongoing journey for me. I hope you'll follow along and learn right alongside me (without the many errors part. Disclaimer, follow at your own risk).",
      "When I'm not baking, I love spending time outdoors with my two kids and loving husband. We especially enjoy sunbathing on the San Marcos River, which is one of my favorite places to relax.",
      "Thanks for stopping by and welcome to my little corner of the internet! I can't wait to connect with all of you over our shared love of baking. Let's decorate some cakes!"
    ]
  }
];

export function getBlogPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find((post) => post.slug === slug);
}

import Image from 'next/image';

const poses = {
 welcome: '/mascot/chaminha-boas-vindas.png',
 thumbsUp: '/mascot/chaminha-legal.png',
 walking: '/mascot/chaminha-caminhando.png',
 music: '/mascot/chaminha-musica.png',
};

export default function Mascot({ pose = 'welcome', className = '', priority = false }: {
 pose?: keyof typeof poses;
 className?: string;
 priority?: boolean;
}) {
 return <Image src={poses[pose]} alt="" aria-hidden="true" width={280} height={280}
  sizes="(max-width: 650px) 150px, 280px" priority={priority}
  className={`mascot ${className}`} />;
}

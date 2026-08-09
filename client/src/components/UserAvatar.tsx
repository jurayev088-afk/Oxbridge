interface UserAvatarProps {
  name: string;
  photoUrl?: string;
  size?: 'sm' | 'md';
}

export function UserAvatar({ name, photoUrl, size = 'sm' }: UserAvatarProps) {
  const className = size === 'sm' ? 'user-avatar-sm' : 'user-avatar-md';

  if (photoUrl) {
    return <img src={photoUrl} alt={name} className={`${className} user-avatar-img`} />;
  }

  return <div className={className}>{name[0]?.toUpperCase() ?? '?'}</div>;
}

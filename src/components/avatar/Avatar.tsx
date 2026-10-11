// Someone's avatar, drawn from their saved choices. Works in server and
// client components alike (no hooks). Pass any config: unknown or missing
// parts are drawn as that slot's default, so other people's data is safe here.
import PixelArt from "@/components/ui/PixelArt";
import { avatarPalette, composeAvatar, type AvatarConfig } from "@/lib/avatar/compose";
import { AVATAR_SIZE } from "@/lib/avatar/parts";

const OUTLINE = "0 -2px 0 0 #2a1b3d, 0 2px 0 0 #2a1b3d, -2px 0 0 0 #2a1b3d, 2px 0 0 0 #2a1b3d";

interface AvatarProps {
  config: AvatarConfig;
  /** Width and height on screen, in px. The art is 16x16 and stays crisp at any size. */
  size?: number;
  /** Say whose it is for screen readers; leave out when the name is right beside it. */
  title?: string;
  className?: string;
}

export default function Avatar({ config, size = 48, title, className = "" }: Readonly<AvatarProps>) {
  return (
    <span className={`inline-flex shrink-0 ${className}`} style={{ boxShadow: OUTLINE, width: size, height: size }}>
      <PixelArt grid={composeAvatar(config)} palette={avatarPalette(config)} scale={size / AVATAR_SIZE} title={title} />
    </span>
  );
}

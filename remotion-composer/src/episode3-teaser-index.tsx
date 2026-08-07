import { Composition, registerRoot } from "remotion";
import { Teaser } from "./episode3-teaser/Teaser";
import { teaserData } from "./episode3-teaser/data";

const TeaserRoot: React.FC = () => (
  <Composition
    id="Episode3Teaser"
    component={Teaser}
    durationInFrames={Math.ceil(teaserData.totalDuration * 30)}
    fps={30}
    width={1080}
    height={1920}
  />
);

registerRoot(TeaserRoot);

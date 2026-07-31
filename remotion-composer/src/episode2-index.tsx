import { Composition, registerRoot } from "remotion";
import { Episode2 } from "./episode2/Episode2";
import { episode2Data } from "./episode2/data";

const Episode2Root: React.FC = () => (
  <Composition
    id="Episode2"
    component={Episode2}
    durationInFrames={Math.ceil(episode2Data.totalDuration * 30)}
    fps={30}
    width={1920}
    height={1080}
  />
);

registerRoot(Episode2Root);

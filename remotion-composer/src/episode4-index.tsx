import { Composition, registerRoot } from "remotion";
import { Episode4 } from "./episode4/Episode4";
import { episode4Data } from "./episode4/data";

const Episode4Root: React.FC = () => (
  <Composition
    id="Episode4"
    component={Episode4}
    durationInFrames={Math.ceil(episode4Data.totalDuration * 30)}
    fps={30}
    width={1280}
    height={720}
  />
);

registerRoot(Episode4Root);

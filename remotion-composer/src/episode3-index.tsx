import { Composition, registerRoot } from "remotion";
import { Episode3 } from "./episode3/Episode3";
import { episode3Data } from "./episode3/data";

const Episode3Root: React.FC = () => (
  <Composition
    id="Episode3"
    component={Episode3}
    durationInFrames={Math.ceil((episode3Data.introDuration + episode3Data.totalDuration) * 30)}
    fps={30}
    width={1280}
    height={720}
  />
);

registerRoot(Episode3Root);

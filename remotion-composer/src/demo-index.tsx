import { Composition, registerRoot } from "remotion";
import { EpisodeLoopDemo } from "./EpisodeLoopDemo";

const DemoRoot: React.FC = () => (
  <Composition
    id="EpisodeLoopDemo"
    component={EpisodeLoopDemo}
    durationInFrames={Math.round(8.49 * 30)}
    fps={30}
    width={1920}
    height={1080}
  />
);

registerRoot(DemoRoot);

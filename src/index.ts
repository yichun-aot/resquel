import Resquel from './resquel';
import { ResquelConfig } from './types/config';

// Attempt at preserving the 1.0 way of calling this lib
// Typescript consumers should just import Resquel
const legacy = (config: ResquelConfig) => {
  const resquel = new Resquel(config);
  return resquel.router;
};
export default legacy;

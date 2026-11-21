import { mount } from '@/ui/Root';
import { IamProvider } from '@/ui/data';
import { App } from './App';
import { realDeps } from './realDeps';

mount(
  <IamProvider>
    <App deps={realDeps} />
  </IamProvider>,
);

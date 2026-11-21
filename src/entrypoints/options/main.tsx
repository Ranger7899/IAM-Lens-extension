import { mount } from '@/ui/Root';
import { IamProvider } from '@/ui/data';
import { App } from './App';

mount(
  <IamProvider>
    <App />
  </IamProvider>,
);

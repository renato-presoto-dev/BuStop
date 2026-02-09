import { Routes } from '@angular/router';
import { LoginPageComponent } from './pages/login-page/login-page.component';
import { ApoioPageComponent } from './pages/apoio-page/apoio-page.component';
import { CidadePageComponent } from './pages/cidade-page/cidade-page.component';
import { HorariosPageComponent } from './pages/horarios-page/horarios-page.component';
import { ConfigPageComponent } from './pages/config-page/config-page.component';
import { MainPageComponent } from './pages/main-page/main-page.component';
import { AdminComponent } from './components/admin/admin.component';

export const routes: Routes = [
    {
        path: 'login',
        component: LoginPageComponent,
        title: 'Bustop - Bem vindo'
      },
      {
        path: 'apoio',
        component: ApoioPageComponent,
        title: 'Apoie-nos'
      },
      {
        path: 'cidade',
        component: CidadePageComponent,
        title: 'Escolha sua cidade'
      },
      {
        path: 'horarios',
        component: HorariosPageComponent,
        title: 'Horarios do terminal'
      },
      {
        path: 'config',
        component: ConfigPageComponent,
        title: 'Configurações'
      },
      {
        path: 'main',
        component: MainPageComponent,
        title: 'Bustop'
      },
        {
          path: 'admin',
        component: AdminComponent,
        title: 'Painel de admin de rotas'
      },
      { path: '', redirectTo: 'main', pathMatch: 'full' }
];

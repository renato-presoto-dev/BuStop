import { Component } from '@angular/core';
import { MapaComponent } from '../../components/mapa/mapa.component';
MapaComponent
@Component({
  selector: 'app-main-page',
  standalone: true,
  imports: [MapaComponent],
  templateUrl: './main-page.component.html',
  styleUrl: './main-page.component.css'
})
export class MainPageComponent {

}

import { Component, AfterViewInit } from '@angular/core';
import * as L from 'leaflet';

@Component({
  selector: 'app-mapa',
  standalone: true,
  imports: [],
  templateUrl: './mapa.component.html',
  styleUrl: './mapa.component.css'
})
export class MapaComponent implements AfterViewInit {
  private map: any;

  ngAfterViewInit(): void {
    this.initMap();
  }

  private initMap(): void {
    // Inicializa o mapa no elemento com id 'map'
    this.map = L.map('map', {
      center: [-23.5505, -46.6333], // Coordenadas iniciais (ex: São Paulo)
      zoom: 13
    });

    // Adiciona os tiles do OpenStreetMap
    const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      minZoom: 3,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    });

    tiles.addTo(this.map);
  }
}
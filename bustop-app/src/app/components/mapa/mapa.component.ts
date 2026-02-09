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
    // 1. Inicia o mapa com uma posição padrão (ex: São Paulo) para não ficar vazio
    this.initMap(-23.5505, -46.6333); 
    
    // 2. Busca a posição real do usuário
    this.carregarLocalizacaoUsuario();
  }

  private initMap(lat: number, lng: number): void {
    this.map = L.map('map', {
      center: [lat, lng],
      zoom: 13
    });

    const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      minZoom: 3,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    });

    tiles.addTo(this.map);
  }

  private carregarLocalizacaoUsuario(): void {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;

          // 1. Move o mapa
          this.map.flyTo([lat, lng], 16);

          // 2. Cria o ícone do bonequinho personalizado
          const iconeBonequinho = L.icon({
            // URL da imagem (usei um exemplo público aqui)
            iconUrl: 'assets/icones/pin-user.png',
            
            iconSize:     [20, 40], // Tamanho do ícone em pixels [largura, altura]
            iconAnchor:   [20, 40], // Ponto da imagem que fica na coordenada exata [metade da largura, altura total] (pés do boneco)
            popupAnchor:  [0, -40]  // Ponto onde o popup abre em relação ao anchor
          });

          // 3. Adiciona o marcador passando a opção { icon: ... }
          L.marker([lat, lng], { icon: iconeBonequinho }).addTo(this.map)
            .bindPopup("Você está aqui!")
            .openPopup();
        },
        (error) => {
          console.error('Erro ao obter localização:', error);
          // Pode adicionar um alerta visual para o usuário aqui
          alert('Não foi possível obter sua localização.');
        },
        { timeout: 10000 } // Opcional: tempo limite para tentar pegar o GPS
      );
    } else {
      console.warn('Geolocalização não suportada.');
    }
  }
}
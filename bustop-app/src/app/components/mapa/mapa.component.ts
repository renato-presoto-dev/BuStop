import { Component, AfterViewInit, OnDestroy } from '@angular/core';
import * as L from 'leaflet';
import { Subscription } from 'rxjs';
import { RotaService, Rota } from '../../services/rota/rota.service';

@Component({
  selector: 'app-mapa',
  standalone: true,
  imports: [],
  templateUrl: './mapa.component.html',
  styleUrl: './mapa.component.css'
})
export class MapaComponent implements AfterViewInit, OnDestroy {
  private map: any;
  private rotaSubscription: Subscription | undefined;
  
  // Guardamos as camadas desenhadas para poder limpar antes de atualizar
  private camadasDeRotas: L.Layer[] = [];

  constructor(private rotaService: RotaService) {}

  ngAfterViewInit(): void {
    // 1. Inicia o mapa (Padrão: São Paulo)
    this.initMap(-23.5505, -46.6333); 
    
    // 2. Busca a posição real do usuário (GPS)
    this.carregarLocalizacaoUsuario();

    // 3. Inscreve-se para RECEBER AS ROTAS do Firebase em tempo real
    this.rotaSubscription = this.rotaService.rotas$.subscribe(rotas => {
      this.desenharRotas(rotas);
    });
  }

  ngOnDestroy(): void {
    if (this.rotaSubscription) {
      this.rotaSubscription.unsubscribe();
    }
  }

  private initMap(lat: number, lng: number): void {
    this.map = L.map('map', {
      center: [lat, lng],
      zoom: 13,
      zoomControl: false // Opcional: remove botões de zoom padrão para visual mais limpo
    });

    // Adiciona tiles (mapa visual)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      minZoom: 3,
      attribution: '© OpenStreetMap'
    }).addTo(this.map);
  }

  private carregarLocalizacaoUsuario(): void {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;

          // Voa para a posição do usuário
          this.map.flyTo([lat, lng], 15);

          // Adiciona o marcador do usuário (Bonequinho)
          const iconeBonequinho = L.icon({
            iconUrl: 'assets/icones/pin-user.png', // Ou use 'assets/seu-boneco.png'
            iconSize:     [20, 40],
            iconAnchor:   [20, 40], 
            popupAnchor:  [0, -40]
          });

          L.marker([lat, lng], { icon: iconeBonequinho }).addTo(this.map)
            .bindPopup("Você está aqui!")
            .openPopup();
        },
        (error) => {
          console.warn('Erro GPS:', error);
        }
      );
    }
  }

  // --- Lógica de Desenhar Rotas (Vinda do Firebase) ---

  private desenharRotas(rotas: Rota[]) {
    // 1. Limpa rotas antigas para não duplicar
    this.limparRotasDoMapa();

    // 2. Loop para desenhar cada rota
    rotas.forEach(rota => {
      if (!rota.pontos || rota.pontos.length === 0) return;

      const coordenadas = rota.pontos.map(p => [p.lat, p.lng] as [number, number]);

      // A. Desenha a LINHA (Caminho)
      const linha = L.polyline(coordenadas, {
        color: rota.cor,
        weight: 5,
        opacity: 0.8
      }).addTo(this.map);
      
      // Adiciona popup com o nome da rota ao clicar na linha
      linha.bindPopup(`<b>${rota.nome}</b>`);
      
      this.camadasDeRotas.push(linha);

      // B. Desenha os PONTOS (Paradas)
      rota.pontos.forEach((p, index) => {
        // Cria um ícone simples via CSS (bolinha colorida)
        const iconePonto = L.divIcon({
          className: 'marcador-rota-usuario',
          html: `<div style="background-color: ${rota.cor}; box-shadow: 0 0 5px ${rota.cor};"></div>`,
          iconSize: [12, 12],
          iconAnchor: [6, 6] // Centraliza
        });

        const marcador = L.marker([p.lat, p.lng], { icon: iconePonto }).addTo(this.map);
        
        // Popup opcional na parada
        marcador.bindPopup(`<b>${rota.nome}</b><br>Parada ${index + 1}`);
        
        this.camadasDeRotas.push(marcador);
      });
    });
  }

  private limparRotasDoMapa() {
    this.camadasDeRotas.forEach(layer => {
      this.map.removeLayer(layer);
    });
    this.camadasDeRotas = [];
  }
}
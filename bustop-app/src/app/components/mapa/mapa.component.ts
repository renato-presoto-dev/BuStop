import { RotaService, Rota } from './../../services/rota/rota.service';
import { Component, AfterViewInit, OnDestroy } from '@angular/core';
import * as L from 'leaflet';
import { Subscription } from 'rxjs';


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
  private camadasDeRotas: L.Layer[] = [];

  constructor(private rotaService: RotaService) {}

  ngAfterViewInit(): void {
    this.initMap(-23.9831, -48.8716); 
    this.carregarLocalizacaoUsuario();

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
      zoom: 14,
      zoomControl: false 
    });

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
          this.map.flyTo([lat, lng], 15);

          const iconeBonequinho = L.icon({
            iconUrl: 'assets/icones/pin-user.png',
            iconSize: [20, 40],
            iconAnchor: [20, 40], 
            popupAnchor: [0, -40]
          });

          L.marker([lat, lng], { icon: iconeBonequinho }).addTo(this.map)
            .bindPopup("Você está aqui!");
        },
        (error) => console.warn('Erro GPS:', error)
      );
    }
  }

  // --- Lógica de Desenhar Rotas (Usuário Final) ---

  private desenharRotas(rotas: Rota[]) {
    this.limparRotasDoMapa();

    rotas.forEach(rota => {
      
      // A. Desenha a LINHA (O trajeto invisível criado pelo Admin)
      if (rota.caminho && rota.caminho.length > 0) {
        const coordenadas = rota.caminho.map(p => [p.lat, p.lng] as [number, number]);
        
        // Se a rota for cíclica, liga o fim ao começo
        if (rota.isCiclica && coordenadas.length > 2) {
            coordenadas.push(coordenadas[0]);
        }

        const linha = L.polyline(coordenadas, {
          color: rota.cor,
          weight: 5,
          opacity: 0.8
        }).addTo(this.map);
        
        linha.bindPopup(`<b>${rota.nome}</b>`);
        this.camadasDeRotas.push(linha);
      }

      // B. Desenha as PARADAS DE ÔNIBUS (Visível para o usuário)
      if (rota.paradas && rota.paradas.length > 0) {
        const iconOnibus = L.divIcon({
          className: 'bus-stop-icon',
          html: `<div style="background-color:${rota.cor}; width:20px; height:20px; border-radius:50%; border:2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:center; color:white; font-weight:bold; font-size:10px;">B</div>`,
          iconSize: [24, 24], 
          iconAnchor: [12, 12]
        });

        rota.paradas.forEach((p) => {
          const marcador = L.marker([p.lat, p.lng], { icon: iconOnibus }).addTo(this.map);
          marcador.bindPopup(`<b>${p.nome || 'Ponto de Ônibus'}</b><br><small>Rota: ${rota.nome}</small>`);
          this.camadasDeRotas.push(marcador);
        });
      }
    });
  }

  private limparRotasDoMapa() {
    this.camadasDeRotas.forEach(layer => this.map.removeLayer(layer));
    this.camadasDeRotas = [];
  }
}
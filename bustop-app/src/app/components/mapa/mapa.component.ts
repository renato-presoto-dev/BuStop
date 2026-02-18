import { RotaService,  Rota, Parada  } from './../../services/rota/rota.service';
import { Component, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common'; // Importante para o *ngIf
import * as L from 'leaflet';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-mapa',
  standalone: true,
  imports: [CommonModule], // Adicione CommonModule aqui
  templateUrl: './mapa.component.html',
  styleUrl: './mapa.component.css'
})
export class MapaComponent implements AfterViewInit, OnDestroy {
  private map: any;
  private rotaSubscription: Subscription | undefined;
  private camadasDeRotas: L.Layer[] = [];
  
  // Elementos visuais temporários
  private linhaConexaoUsuario: L.Polyline | null = null;
  private marcadorUsuario: L.Marker | null = null;

  // Estado para o HTML
  userLatLng: L.LatLng | null = null;
  rotaSelecionada: Rota | null = null;
  paradaSelecionada: Parada | null = null;
  distanciaUsuario: string = '';

  constructor(private rotaService: RotaService) {}

  ngAfterViewInit(): void {
    this.initMap(-23.5505, -46.6333); 
    this.carregarLocalizacaoUsuario();

    this.rotaSubscription = this.rotaService.rotas$.subscribe(rotas => {
      this.desenharRotas(rotas);
    });
  }

  ngOnDestroy(): void {
    if (this.rotaSubscription) this.rotaSubscription.unsubscribe();
  }

  private initMap(lat: number, lng: number): void {
    this.map = L.map('map', { center: [lat, lng], zoom: 14, zoomControl: false });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '© OpenStreetMap'
    }).addTo(this.map);
  }

  private carregarLocalizacaoUsuario(): void {
    if (navigator.geolocation) {
      navigator.geolocation.watchPosition( // watchPosition atualiza se o usuario andar
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          this.userLatLng = new L.LatLng(lat, lng);

          // Se já tem marcador, só move. Se não, cria.
          if (this.marcadorUsuario) {
            this.marcadorUsuario.setLatLng(this.userLatLng);
          } else {
            const iconeBonequinho = L.icon({
              iconUrl: 'assets/icones/pin-user.png',
              iconSize: [20, 40], iconAnchor: [20, 40], popupAnchor: [0, -40]
            });
            this.marcadorUsuario = L.marker([lat, lng], { icon: iconeBonequinho }).addTo(this.map);
            this.map.flyTo([lat, lng], 15);
          }
        },
        (error) => console.warn('Erro GPS:', error),
        { enableHighAccuracy: true }
      );
    }
  }

  // --- AÇÃO DE CLIQUE NO PONTO ---
  
  selecionarPonto(rota: Rota, parada: Parada) {
    this.rotaSelecionada = rota;
    this.paradaSelecionada = parada;

    // 1. Remove linha pontilhada antiga se existir
    if (this.linhaConexaoUsuario) {
      this.map.removeLayer(this.linhaConexaoUsuario);
      this.linhaConexaoUsuario = null;
    }

    // 2. Se temos a localização do usuário, traça a rota e ajusta o zoom
    if (this.userLatLng) {
      const destinoLatLng = new L.LatLng(parada.lat, parada.lng);
      
      // Cria linha pontilhada (Cinza escuro)
      this.linhaConexaoUsuario = L.polyline([this.userLatLng, destinoLatLng], {
        color: '#555',
        weight: 4,
        dashArray: '10, 10', // O efeito pontilhado
        opacity: 0.7
      }).addTo(this.map);

      // Calcula distância simples (Linha reta) para exibir
      const distMetros = this.userLatLng.distanceTo(destinoLatLng);
      this.distanciaUsuario = distMetros > 1000 
        ? (distMetros / 1000).toFixed(1) + ' km' 
        : Math.round(distMetros) + ' m';

      // Ajusta o zoom para caber o bonequinho e o ponto de ônibus com margem (padding)
      this.map.fitBounds(this.linhaConexaoUsuario.getBounds(), {
        padding: [50, 50], // Margem em pixels
        maxZoom: 16
      });
    }
  }

  fecharPainel() {
    this.rotaSelecionada = null;
    this.paradaSelecionada = null;
    if (this.linhaConexaoUsuario) {
      this.map.removeLayer(this.linhaConexaoUsuario);
      this.linhaConexaoUsuario = null;
    }
    // Opcional: Voltar zoom para o usuário
    if(this.userLatLng) this.map.flyTo(this.userLatLng, 15);
  }

  // --- DESENHO DAS ROTAS ---

  private desenharRotas(rotas: Rota[]) {
    this.limparRotasDoMapa();

    rotas.forEach(rota => {
      // Linha do Trajeto
      if (rota.caminho && rota.caminho.length > 0) {
        const coords = rota.caminho.map(p => [p.lat, p.lng] as [number, number]);
        if (rota.isCiclica && coords.length > 2) coords.push(coords[0]);

        const linha = L.polyline(coords, { color: rota.cor, weight: 5, opacity: 0.8 }).addTo(this.map);
        linha.bindPopup(`<b>${rota.nome}</b>`); // Clique na linha mostra só o nome
        this.camadasDeRotas.push(linha);
      }

      // Pontos de Ônibus (Com evento de clique especial)
      if (rota.paradas && rota.paradas.length > 0) {
        const iconOnibus = L.divIcon({
          className: 'bus-stop-icon',
          html: `<div style="background-color:${rota.cor}; width:20px; height:20px; border-radius:50%; border:2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:center; color:white; font-weight:bold; font-size:10px;">B</div>`,
          iconSize: [24, 24], iconAnchor: [12, 12]
        });

        rota.paradas.forEach((p) => {
          const marcador = L.marker([p.lat, p.lng], { icon: iconOnibus }).addTo(this.map);
          
          // IMPORTANTE: Ao clicar, chamamos nossa função personalizada em vez de abrir popup padrão
          marcador.on('click', () => {
            // Injeta dados falsos de horário se não tiver, só para teste visual
            if(!rota.horarios) rota.horarios = ['07:15', '07:45', '08:15', '08:45', '09:20'];
            
            this.selecionarPonto(rota, p);
          });

          this.camadasDeRotas.push(marcador);
        });
      }
    });
  }

  private limparRotasDoMapa() {
    this.camadasDeRotas.forEach(l => this.map.removeLayer(l));
    this.camadasDeRotas = [];
  }
}
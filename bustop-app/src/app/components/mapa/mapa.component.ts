import { Component, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';
import { Subscription } from 'rxjs';
import { RotaService, Rota, Parada } from '../../services/rota/rota.service';

@Component({
  selector: 'app-mapa',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mapa.component.html',
  styleUrl: './mapa.component.css'
})
export class MapaComponent implements AfterViewInit, OnDestroy {
  private map: any;
  private rotaSubscription: Subscription | undefined;
  private camadasDeRotas: L.Layer[] = [];
  
  private linhaConexaoUsuario: L.Polyline | null = null;
  private marcadorUsuario: L.Marker | null = null;
  
  // NOVO: Variável para guardar o ID do rastreador do GPS
  private watchId: number | null = null;

  userLatLng: L.LatLng | null = null;
  rotaSelecionada: Rota | null = null;
  paradaSelecionada: Parada | null = null;
  distanciaUsuario: string = '';

  constructor(private rotaService: RotaService) {}

  ngAfterViewInit(): void {
    this.initMap(-23.9831, -48.8716);
    this.carregarLocalizacaoUsuario();

    this.rotaSubscription = this.rotaService.rotas$.subscribe(rotas => {
      this.desenharRotas(rotas);
    });
  }

  // A MÁGICA DA LIMPEZA ACONTECE AQUI
  ngOnDestroy(): void {
    if (this.rotaSubscription) {
      this.rotaSubscription.unsubscribe();
    }
    
    // 1. Desliga o rastreador de GPS
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
    }

    // 2. Destrói o mapa para liberar memória e não bugar o HTML ao voltar
    if (this.map) {
      this.map.remove();
    }
  }

  private initMap(lat: number, lng: number): void {
    this.map = L.map('map', { center: [lat, lng], zoom: 14, zoomControl: false });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '© OpenStreetMap'
    }).addTo(this.map);
  }

  private carregarLocalizacaoUsuario(): void {
    if (navigator.geolocation) {
      
      // 1. Pega a posição IMEDIATAMENTE (resolve o problema de não aparecer parado)
      navigator.geolocation.getCurrentPosition(
        (position) => this.atualizarMarcadorUsuario(position),
        (error) => console.warn('Erro no GPS inicial:', error),
        { enableHighAccuracy: true, maximumAge: 10000 } // Aceita um cache de 10s para ser mais rápido
      );

      // 2. Fica assistindo caso o usuário comece a andar (salva o ID para limpar depois)
      this.watchId = navigator.geolocation.watchPosition(
        (position) => this.atualizarMarcadorUsuario(position),
        (error) => console.warn('Erro no GPS em movimento:', error),
        { enableHighAccuracy: true }
      );
    }
  }

  // Criei essa função para não repetir código
  private atualizarMarcadorUsuario(position: GeolocationPosition): void {
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    this.userLatLng = new L.LatLng(lat, lng);

    if (this.marcadorUsuario) {
      // Se o bonequinho já existe, só move ele de lugar
      this.marcadorUsuario.setLatLng(this.userLatLng);
    } else {
      // Se não existe, cria ele
      const iconeBonequinho = L.icon({
        iconUrl: 'assets/icones/pin-user.png',
        iconSize: [20, 40], iconAnchor: [20, 40], popupAnchor: [0, -40]
      });
      this.marcadorUsuario = L.marker([lat, lng], { icon: iconeBonequinho }).addTo(this.map);
      
      // Faz o mapa "voar" até o usuário só na primeira vez que ele é criado
      this.map.flyTo([lat, lng], 15);
    }

    // Se a linha pontilhada estiver ativa e o usuário andou, atualizamos ela!
    if (this.linhaConexaoUsuario && this.paradaSelecionada) {
      const destinoLatLng = new L.LatLng(this.paradaSelecionada.lat, this.paradaSelecionada.lng);
      this.linhaConexaoUsuario.setLatLngs([this.userLatLng, destinoLatLng]);
      
      const distMetros = this.userLatLng.distanceTo(destinoLatLng);
      this.distanciaUsuario = distMetros > 1000 
        ? (distMetros / 1000).toFixed(1) + ' km' 
        : Math.round(distMetros) + ' m';
    }
  }

  // --- AÇÃO AO CLICAR NO PONTO ---
  
  selecionarPonto(rota: Rota, parada: Parada) {
    this.rotaSelecionada = rota;
    this.paradaSelecionada = parada;

    if (this.linhaConexaoUsuario) {
      this.map.removeLayer(this.linhaConexaoUsuario);
      this.linhaConexaoUsuario = null;
    }

    if (this.userLatLng) {
      const destinoLatLng = new L.LatLng(parada.lat, parada.lng);
      
      this.linhaConexaoUsuario = L.polyline([this.userLatLng, destinoLatLng], {
        color: '#555', weight: 4, dashArray: '10, 10', opacity: 0.7
      }).addTo(this.map);

      const distMetros = this.userLatLng.distanceTo(destinoLatLng);
      this.distanciaUsuario = distMetros > 1000 
        ? (distMetros / 1000).toFixed(1) + ' km' 
        : Math.round(distMetros) + ' m';

      this.map.fitBounds(this.linhaConexaoUsuario.getBounds(), {
        padding: [50, 50], maxZoom: 16
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
  }

  // --- DESENHO DO MAPA ---

  private desenharRotas(rotas: Rota[]) {
    this.limparRotasDoMapa();

    rotas.forEach(rota => {
      if (rota.caminho && rota.caminho.length > 0) {
        const coords = rota.caminho.map(p => [p.lat, p.lng] as [number, number]);
        if (rota.isCiclica && coords.length > 2) coords.push(coords[0]);

        const linha = L.polyline(coords, { color: rota.cor, weight: 5, opacity: 0.8 }).addTo(this.map);
        this.camadasDeRotas.push(linha);
      }

      if (rota.paradas && rota.paradas.length > 0) {
        const iconOnibus = L.divIcon({
          className: 'bus-stop-icon',
          html: `<div style="background-color:${rota.cor}; width:20px; height:20px; border-radius:50%; border:2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:center; color:white; font-weight:bold; font-size:10px;">B</div>`,
          iconSize: [24, 24], iconAnchor: [12, 12]
        });

        rota.paradas.forEach((p) => {
          const marcador = L.marker([p.lat, p.lng], { icon: iconOnibus }).addTo(this.map);
          marcador.on('click', () => this.selecionarPonto(rota, p));
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
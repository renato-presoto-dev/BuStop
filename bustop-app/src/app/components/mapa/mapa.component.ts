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
  private subs = new Subscription();
  
  // Guardar os dados do Firebase localmente
  rotas: Rota[] = [];
  paradas: Parada[] = [];

  // Camadas do mapa
  private camadasParadas: L.Layer[] = [];
  private camadaRotaDestaque: L.Polyline | null = null;
  private linhaConexaoUsuario: L.Polyline | null = null;
  private marcadorUsuario: L.Marker | null = null;
  private watchId: number | null = null;

  // Estado para a Interface (HTML)
  userLatLng: L.LatLng | null = null;
  paradaSelecionada: Parada | null = null;
  rotaDestaqueSelecionada: Rota | null = null;
  distanciaUsuario: string = '';

  constructor(private rotaService: RotaService) {}

  ngAfterViewInit(): void {
    this.initMap(-23.9831, -48.8716);
    this.carregarLocalizacaoUsuario();

    // 1. Subscreve às Rotas (Apenas guardamos na memória para consulta rápida)
    this.subs.add(this.rotaService.rotas$.subscribe(r => {
      this.rotas = r;
      // Se houver uma rota em destaque, redesenha-a caso os dados tenham mudado
      if (this.rotaDestaqueSelecionada) {
        this.destacarRota(this.rotaDestaqueSelecionada.id!);
      }
    }));

    // 2. Subscreve às Paradas (Desenhamos no mapa sempre que atualiza)
    this.subs.add(this.rotaService.paradas$.subscribe(p => {
      this.paradas = p;
      this.desenharParadasGlobais();
    }));
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    if (this.watchId !== null) navigator.geolocation.clearWatch(this.watchId);
    if (this.map) this.map.remove();
  }

  private initMap(lat: number, lng: number): void {
    this.map = L.map('map', { center: [lat, lng], zoom: 14, zoomControl: false });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '© OpenStreetMap'
    }).addTo(this.map);
  }

  private carregarLocalizacaoUsuario(): void {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => this.atualizarMarcadorUsuario(pos),
        (err) => console.warn('Erro GPS inicial:', err),
        { enableHighAccuracy: true, maximumAge: 10000 }
      );

      this.watchId = navigator.geolocation.watchPosition(
        (pos) => this.atualizarMarcadorUsuario(pos),
        (err) => console.warn('Erro GPS movimento:', err),
        { enableHighAccuracy: true }
      );
    }
  }

  private atualizarMarcadorUsuario(position: GeolocationPosition): void {
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    this.userLatLng = new L.LatLng(lat, lng);

    if (this.marcadorUsuario) {
      this.marcadorUsuario.setLatLng(this.userLatLng);
    } else {
      const icone = L.icon({
        iconUrl: 'assets/icones/pin-user.png',
        iconSize: [20, 40], iconAnchor: [20, 40], popupAnchor: [0, -40]
      });
      this.marcadorUsuario = L.marker([lat, lng], { icon: icone }).addTo(this.map);
      this.map.flyTo([lat, lng], 15);
    }

    if (this.linhaConexaoUsuario && this.paradaSelecionada) {
      const dest = new L.LatLng(this.paradaSelecionada.lat, this.paradaSelecionada.lng);
      this.linhaConexaoUsuario.setLatLngs([this.userLatLng, dest]);
      this.atualizarDistancia(this.userLatLng, dest);
    }
  }

  // ==========================================
  // INTERAÇÕES E DESENHOS NO MAPA
  // ==========================================

  private desenharParadasGlobais() {
    // Limpa pontos antigos
    this.camadasParadas.forEach(l => this.map.removeLayer(l));
    this.camadasParadas = [];

    const iconOnibus = L.divIcon({
      className: 'bus-stop-icon',
      html: `<div style="background-color:#007bff; width:22px; height:22px; border-radius:50%; border:2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:center; color:white; font-weight:bold; font-size:11px;">B</div>`,
      iconSize: [26, 26], iconAnchor: [13, 13]
    });

    this.paradas.forEach((p) => {
      const marcador = L.marker([p.lat, p.lng], { icon: iconOnibus }).addTo(this.map);
      marcador.on('click', () => this.abrirPainelParada(p));
      this.camadasParadas.push(marcador);
    });
  }

  abrirPainelParada(parada: Parada) {
    this.paradaSelecionada = parada;
    this.limparRotaDestaque(); // Limpa o trajeto anterior se houver

    // Traçar linha pontilhada do utilizador até ao ponto
    if (this.userLatLng) {
      const dest = new L.LatLng(parada.lat, parada.lng);
      
      this.linhaConexaoUsuario = L.polyline([this.userLatLng, dest], {
        color: '#555', weight: 4, dashArray: '10, 10', opacity: 0.7
      }).addTo(this.map);

      this.atualizarDistancia(this.userLatLng, dest);

      this.map.fitBounds(this.linhaConexaoUsuario.getBounds(), { padding: [50, 50], maxZoom: 16 });
    } else {
      this.map.flyTo([parada.lat, parada.lng], 16);
    }
  }

  // Esta função é chamada quando o utilizador clica num horário da tabela
  destacarRota(rotaId: string) {
    this.limparRotaDestaque();

    const rotaCompleta = this.rotas.find(r => r.id === rotaId);
    if (!rotaCompleta || !rotaCompleta.caminho || rotaCompleta.caminho.length === 0) return;

    this.rotaDestaqueSelecionada = rotaCompleta;

    const coords = rotaCompleta.caminho.map(p => [p.lat, p.lng] as [number, number]);
    if (rotaCompleta.isCiclica && coords.length > 2) coords.push(coords[0]);

    this.camadaRotaDestaque = L.polyline(coords, { 
      color: rotaCompleta.cor, 
      weight: 6, 
      opacity: 0.8 
    }).addTo(this.map);

    // Ajusta o mapa para mostrar o trajeto inteiro daquela rota específica
    this.map.fitBounds(this.camadaRotaDestaque.getBounds(), { padding: [30, 30] });
  }

  fecharPainel() {
    this.paradaSelecionada = null;
    this.limparRotaDestaque();
    if (this.linhaConexaoUsuario) {
      this.map.removeLayer(this.linhaConexaoUsuario);
      this.linhaConexaoUsuario = null;
    }
    if (this.userLatLng) this.map.flyTo(this.userLatLng, 15);
  }

  private limparRotaDestaque() {
    this.rotaDestaqueSelecionada = null;
    if (this.camadaRotaDestaque) {
      this.map.removeLayer(this.camadaRotaDestaque);
      this.camadaRotaDestaque = null;
    }
  }

  private atualizarDistancia(inicio: L.LatLng, fim: L.LatLng) {
    const distMetros = inicio.distanceTo(fim);
    this.distanciaUsuario = distMetros > 1000 
      ? (distMetros / 1000).toFixed(1) + ' km' 
      : Math.round(distMetros) + ' m';
  }

  // --- Funções Auxiliares para o HTML ---
  
  // Encontra a Rota pelo ID para mostrarmos o Nome e a Cor no botão do horário
  getRota(rotaId: string): Rota | undefined {
    return this.rotas.find(r => r.id === rotaId);
  }
}
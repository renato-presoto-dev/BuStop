import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';
import { Subscription } from 'rxjs';
import { RotaService,  Rota, Parada, HorarioPassagem, Coordenada } from '../../services/rota/rota.service';
@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css'
})
export class AdminComponent implements OnInit, OnDestroy {
  private map: any;
  private subs = new Subscription();

  // Dados do Banco
  rotas: Rota[] = [];
  paradas: Parada[] = [];

  // Estado da Interface
  abaAtiva: 'rotas' | 'paradas' = 'rotas'; // Alterna entre gerenciar Rotas ou Pontos
  sidebarAberta: boolean = true;
  modoEdicao: 'desenhar' | 'borracha' = 'desenhar';
  
  // Seleções
  rotaSelecionada: Rota | null = null;
  paradaEmEdicao: Parada | null = null;

  // Temporários para o Modal
  novoHorarioHora: string = '';
  novoHorarioRotaId: string = '';

  constructor(private rotaService: RotaService) {}

  ngOnInit(): void {
    this.initMap();

    // Escuta Rotas
    this.subs.add(this.rotaService.rotas$.subscribe(r => {
      this.rotas = r;
      this.renderizarMapa();
    }));

    // Escuta Paradas
    this.subs.add(this.rotaService.paradas$.subscribe(p => {
      this.paradas = p;
      this.renderizarMapa();
    }));
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    if (this.map) this.map.remove();
  }

  private initMap(): void {
    this.map = L.map('mapAdmin', { center: [-23.9831, -48.8716], zoom: 13 });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.map);

    this.map.on('click', (e: any) => {
      if (this.abaAtiva === 'rotas' && this.rotaSelecionada) {
        this.adicionarPontoAoCaminho(e.latlng.lat, e.latlng.lng);
      } else if (this.abaAtiva === 'paradas') {
        this.criarNovoPontoGlobal(e.latlng.lat, e.latlng.lng);
      }
    });
  }

  // ==========================================
  // GESTÃO DE ROTAS (ABAS)
  // ==========================================
  
  async criarNovaRota() {
    const cores = ['#e6194b', '#3cb44b', '#4363d8', '#f58231', '#911eb4'];
    const nova: Rota = {
      nome: 'Nova Rota',
      cor: cores[this.rotas.length % cores.length],
      isCiclica: false,
      caminho: []
    };
    await this.rotaService.adicionarRota(nova);
  }
  atualizarNomeRota(rota: Rota) {
    this.rotaService.atualizarRota(rota);
  }

  excluirRota(id: string | undefined, event: Event) {
    event.stopPropagation(); // Evita que o clique selecione a rota no fundo
    if (id && confirm('Tem certeza que deseja excluir esta rota e o seu trajeto?')) {
      this.rotaService.removerRota(id);
      // Se a rota excluída era a que estava selecionada, limpa a tela
      if (this.rotaSelecionada?.id === id) {
        this.rotaSelecionada = null;
      }
    }
  }
  alternarCiclo(rota: Rota) {
    rota.isCiclica = !rota.isCiclica;
    this.rotaService.atualizarRota(rota);
  }

  async adicionarPontoAoCaminho(lat: number, lng: number) {
    if (this.rotaSelecionada && this.modoEdicao === 'desenhar') {
      this.rotaSelecionada.caminho.push({ lat, lng });
      await this.rotaService.atualizarRota(this.rotaSelecionada);
    }
  }

  // ==========================================
  // GESTÃO DE PARADAS (PONTOS GLOBAIS)
  // ==========================================

  async criarNovoPontoGlobal(lat: number, lng: number) {
    if (this.modoEdicao === 'desenhar') {
      const nova: Parada = {
        nome: 'Novo Ponto',
        lat, lng,
        horarios: []
      };
      await this.rotaService.adicionarParada(nova);
    }
  }

  abrirEditorParada(parada: Parada) {
    this.paradaEmEdicao = JSON.parse(JSON.stringify(parada)); // Clone para não editar direto
    this.novoHorarioHora = '';
    this.novoHorarioRotaId = '';
  }

  async adicionarHorarioAParada() {
    if (this.paradaEmEdicao && this.novoHorarioHora && this.novoHorarioRotaId) {
      const novo: HorarioPassagem = {
        hora: this.novoHorarioHora,
        rotaId: this.novoHorarioRotaId
      };
      this.paradaEmEdicao.horarios.push(novo);
      this.paradaEmEdicao.horarios.sort((a, b) => a.hora.localeCompare(b.hora));
    }
  }

  removerHorarioDaParada(index: number) {
    this.paradaEmEdicao?.horarios.splice(index, 1);
  }

  async salvarParada() {
    if (this.paradaEmEdicao) {
      await this.rotaService.atualizarParada(this.paradaEmEdicao);
      this.paradaEmEdicao = null;
    }
  }

  // ==========================================
  // RENDERIZAÇÃO
  // ==========================================

  private camadas: L.Layer[] = [];

private renderizarMapa() {
    this.camadas.forEach(l => this.map.removeLayer(l));
    this.camadas = [];

    // 1. Renderiza os caminhos das rotas
    this.rotas.forEach(r => {
      const coords = r.caminho.map(p => [p.lat, p.lng] as [number, number]);
      if (r.isCiclica && coords.length > 2) coords.push(coords[0]);
      
      const poly = L.polyline(coords, { 
        color: r.cor, 
        weight: r.id === this.rotaSelecionada?.id ? 8 : 4,
        opacity: r.id === this.rotaSelecionada?.id ? 1 : 0.4
      }).addTo(this.map);

      // --- CORREÇÃO: Controle inteligente de clique na linha ---
      poly.on('click', (e: any) => {
        L.DomEvent.stopPropagation(e); // Impede duplo-clique no mapa

        // SITUAÇÃO 1: Se estiver na aba "Pontos", clicar na linha CRIARÁ UM PONTO sobre ela
        if (this.abaAtiva === 'paradas') {
          this.criarNovoPontoGlobal(e.latlng.lat, e.latlng.lng);
          return;
        }

        // SITUAÇÃO 2: Se estiver desenhando uma rota A, e clicar sobre a rota B, 
        // a rota A ganhará um nó de trajeto passando por cima da rota B.
        if (this.abaAtiva === 'rotas' && this.modoEdicao === 'desenhar' && this.rotaSelecionada && this.rotaSelecionada.id !== r.id) {
          this.adicionarPontoAoCaminho(e.latlng.lat, e.latlng.lng);
          return;
        }

        // SITUAÇÃO 3: Comportamento normal (Selecionar a rota clicada)
        this.rotaSelecionada = r;
        this.abaAtiva = 'rotas';
      });

      this.camadas.push(poly);
      
      // Desenha as bolinhas brancas do trajeto selecionado
      if (this.rotaSelecionada?.id === r.id) {
        r.caminho.forEach((p, idx) => {
          const dot = L.circleMarker([p.lat, p.lng], { radius: 5, color: 'white', fillOpacity: 1, fillColor: r.cor }).addTo(this.map);
          dot.on('click', (e: any) => {
            L.DomEvent.stopPropagation(e);
            if (this.modoEdicao === 'borracha') {
              r.caminho.splice(idx, 1);
              this.rotaService.atualizarRota(r);
            }
          });
          this.camadas.push(dot);
        });
      }
    });

    // 2. Renderiza os pontos globais de ônibus
    this.paradas.forEach(p => {
      const icon = L.divIcon({
        className: 'bus-stop-admin',
        html: `<div style="background: white; border: 3px solid #333; width: 20px; height: 20px; border-radius: 50%;"></div>`,
        iconSize: [26, 26], iconAnchor: [13, 13]
      });

      const marker = L.marker([p.lat, p.lng], { icon }).addTo(this.map);
      
      marker.on('click', (e: any) => {
        L.DomEvent.stopPropagation(e);

        // --- CORREÇÃO: Se estiver desenhando uma rota e clicar em um ponto de ônibus, 
        // a linha será forçada a passar exatamente sobre aquele ponto!
        if (this.abaAtiva === 'rotas' && this.modoEdicao === 'desenhar' && this.rotaSelecionada) {
          this.adicionarPontoAoCaminho(e.latlng.lat, e.latlng.lng);
          return;
        }

        // Comportamento normal do ponto (apagar ou editar)
        if (this.modoEdicao === 'borracha') {
          this.rotaService.removerParada(p.id!);
        } else {
          this.abrirEditorParada(p);
        }
      });

      this.camadas.push(marker);
    });
  }

  // Helpers de UI
  toggleSidebar() { this.sidebarAberta = !this.sidebarAberta; setTimeout(() => this.map.invalidateSize(), 300); }
  getNomeRota(id: string) { return this.rotas.find(r => r.id === id)?.nome || 'Rota Desconhecida'; }
}
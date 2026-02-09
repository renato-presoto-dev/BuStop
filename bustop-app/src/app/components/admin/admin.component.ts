import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';
import { Subscription } from 'rxjs';
import { RotaService, Rota, Ponto } from '../../services/rota/rota.service'; // Ajuste o caminho se necessário

// Interface estendida apenas para uso visual (não vai pro banco)
interface RotaVisual extends Rota {
  polylineObj?: L.Polyline;     // A linha desenhada no mapa
  marcadoresObj?: L.Marker[];   // Os pinos desenhados no mapa
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css'
})
export class AdminComponent implements OnInit, OnDestroy {
  private map: any;
  private rotaSubscription: Subscription | undefined;

  // Estado Local
  rotasVisuais: RotaVisual[] = [];
  rotaSelecionada: RotaVisual | null = null;
  
  // Paleta de cores para novas rotas
  coresDisponiveis = ['#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231', '#911eb4', '#46f0f0', '#f032e6'];

  constructor(private rotaService: RotaService) {}

  ngOnInit(): void {
    this.initMap();

    // Inscreve-se para receber atualizações do Firebase em tempo real
    this.rotaSubscription = this.rotaService.rotas$.subscribe(rotasDoBanco => {
      this.sincronizarInterface(rotasDoBanco);
    });
  }

  ngOnDestroy(): void {
    // Limpa a subscrição para evitar vazamento de memória
    if (this.rotaSubscription) {
      this.rotaSubscription.unsubscribe();
    }
  }

  private initMap(): void {
    this.map = L.map('mapAdmin', {
      center: [-23.5505, -46.6333], // Coordenadas iniciais (SP)
      zoom: 13
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(this.map);

    // Evento de Clique no Mapa
    this.map.on('click', (e: any) => {
      if (this.rotaSelecionada) {
        this.adicionarPonto(this.rotaSelecionada, e.latlng.lat, e.latlng.lng);
      } else {
        alert('Selecione ou crie uma rota na lista lateral para começar a desenhar!');
      }
    });
  }

  // --- Ações do Usuário ---

  criarNovaRota() {
    const cor = this.coresDisponiveis[this.rotasVisuais.length % this.coresDisponiveis.length];
    
    const novaRota: Rota = {
      // id será gerado pelo Firebase
      nome: `Rota ${this.rotasVisuais.length + 1}`,
      cor: cor,
      pontos: []
    };

    // Envia para o Firebase
    this.rotaService.adicionarRota(novaRota);
  }

  selecionarRota(rota: RotaVisual) {
    this.rotaSelecionada = rota;
    
    // Opcional: Centralizar mapa no último ponto da rota
    if (rota.pontos.length > 0) {
      const ultimo = rota.pontos[rota.pontos.length - 1];
      this.map.panTo([ultimo.lat, ultimo.lng]);
    }
  }

  excluirRota(rota: RotaVisual, event: Event) {
    event.stopPropagation();
    if (confirm(`Tem certeza que deseja excluir a ${rota.nome}?`)) {
      if (rota.id) {
        this.rotaService.removerRota(rota.id);
        // A limpeza visual acontecerá automaticamente via subscribe
      }
    }
  }

  async adicionarPonto(rota: RotaVisual, lat: number, lng: number) {
    const novoPonto: Ponto = { lat, lng };
    
    // 1. Atualiza visualmente (otimização para parecer instantâneo)
    rota.pontos.push(novoPonto);
    
    // 2. Salva no Firebase
    if (rota.id) {
      await this.rotaService.atualizarRota({
        id: rota.id,
        nome: rota.nome,
        cor: rota.cor,
        pontos: rota.pontos
      });
    }
  }

  async removerPonto(rota: RotaVisual, index: number) {
    // Remove do array local
    rota.pontos.splice(index, 1);

    // Atualiza no Firebase
    if (rota.id) {
      await this.rotaService.atualizarRota({
        id: rota.id,
        nome: rota.nome,
        cor: rota.cor,
        pontos: rota.pontos
      });
    }
  }

  async atualizarNomeRota(rota: RotaVisual) {
    // Chamado quando o usuário termina de editar o nome (blur)
    if (rota.id) {
        await this.rotaService.atualizarRota({
            id: rota.id,
            nome: rota.nome,
            cor: rota.cor,
            pontos: rota.pontos
        });
    }
  }

  // --- Lógica de Renderização e Sincronização ---

  private sincronizarInterface(rotasDoBanco: Rota[]) {
    // 1. Limpa todos os desenhos antigos do mapa
    this.rotasVisuais.forEach(r => this.limparDesenhosDaRota(r));

    // 2. Reconstrói os objetos visuais
    this.rotasVisuais = rotasDoBanco.map(r => {
      const visual: RotaVisual = { ...r, marcadoresObj: [] };
      this.desenharRotaNoMapa(visual);
      return visual;
    });

    // 3. Tenta manter a seleção ativa (se a rota ainda existir)
    if (this.rotaSelecionada) {
      const rotaAindaExiste = this.rotasVisuais.find(r => r.id === this.rotaSelecionada!.id);
      this.rotaSelecionada = rotaAindaExiste || null;
    }
  }

  private desenharRotaNoMapa(rota: RotaVisual) {
    const coordenadas = rota.pontos.map(p => [p.lat, p.lng] as [number, number]);

    // Desenha a linha (Polyline)
    rota.polylineObj = L.polyline(coordenadas, { 
      color: rota.cor, 
      weight: 5,
      opacity: 0.7 
    }).addTo(this.map);

    // Desenha as bolinhas (Markers)
    rota.marcadoresObj = rota.pontos.map(p => {
      const icon = L.divIcon({
        className: 'custom-marker-pin',
        html: `<div style="background-color:${rota.cor}; width:12px; height:12px; border-radius:50%; border:2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.4);"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });
      return L.marker([p.lat, p.lng], { icon }).addTo(this.map);
    });
  }

  private limparDesenhosDaRota(rota: RotaVisual) {
    if (rota.polylineObj) this.map.removeLayer(rota.polylineObj);
    if (rota.marcadoresObj) {
      rota.marcadoresObj.forEach(m => this.map.removeLayer(m));
    }
  }
}
import { RotaService, Rota, Coordenada, Parada } from './../../services/rota/rota.service';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';
import { Subscription } from 'rxjs';


// Interface estendida apenas para o controle visual do mapa no painel admin
interface RotaVisual extends Rota {
  polylineObj?: L.Polyline;
  marcadoresObj?: L.Marker[];
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
  
  // Controla qual ferramenta está ativa: trajeto, parada ou borracha
  modoEdicao: 'caminho' | 'parada' | 'borracha' = 'caminho'; 
  
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
    if (this.rotaSubscription) {
      this.rotaSubscription.unsubscribe();
    }
  }

  private initMap(): void {
    this.map = L.map('mapAdmin', {
      center: [-23.9831, -48.8716],
      zoom: 13
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(this.map);

    // Evento de Clique no Mapa baseado na ferramenta selecionada
    this.map.on('click', (e: any) => {
      if (this.rotaSelecionada) {
        if (this.modoEdicao === 'caminho') {
          this.adicionarPontoCaminho(this.rotaSelecionada, e.latlng.lat, e.latlng.lng);
        } else if (this.modoEdicao === 'parada') {
          this.adicionarParadaDeOnibus(this.rotaSelecionada, e.latlng.lat, e.latlng.lng);
        }
        // Se a ferramenta for 'borracha', clicar no mapa vazio não faz nada.
      } else {
        alert('Selecione ou crie uma rota na lista lateral para começar a desenhar!');
      }
    });
  }

  // --- Ações Principais ---

  criarNovaRota() {
    const cor = this.coresDisponiveis[this.rotasVisuais.length % this.coresDisponiveis.length];
    
    const novaRota: Rota = {
      nome: `Rota ${this.rotasVisuais.length + 1}`,
      cor: cor,
      isCiclica: false,
      caminho: [],
      paradas: []
    };

    this.rotaService.adicionarRota(novaRota);
  }

  selecionarRota(rota: RotaVisual) {
    this.rotaSelecionada = rota;
    
    // Centraliza o mapa no último ponto de ônibus ou último ponto do caminho
    if (rota.paradas && rota.paradas.length > 0) {
      const ultimo = rota.paradas[rota.paradas.length - 1];
      this.map.panTo([ultimo.lat, ultimo.lng]);
    } else if (rota.caminho && rota.caminho.length > 0) {
      const ultimo = rota.caminho[rota.caminho.length - 1];
      this.map.panTo([ultimo.lat, ultimo.lng]);
    }
  }

  excluirRota(rota: RotaVisual, event: Event) {
    event.stopPropagation();
    if (confirm(`Tem certeza que deseja excluir a ${rota.nome}?`)) {
      if (rota.id) {
        this.rotaService.removerRota(rota.id);
      }
    }
  }

  // --- Lógica de Edição da Rota ---

  adicionarPontoCaminho(rota: RotaVisual, lat: number, lng: number) {
    if (!rota.caminho) rota.caminho = [];
    rota.caminho.push({ lat, lng });
    this.salvarRotaNoFirebase(rota);
  }

  adicionarParadaDeOnibus(rota: RotaVisual, lat: number, lng: number) {
    if (!rota.paradas) rota.paradas = [];
    rota.paradas.push({ lat, lng, nome: `Ponto ${rota.paradas.length + 1}` });
    this.salvarRotaNoFirebase(rota);
  }

  alternarCiclo(rota: RotaVisual) {
    rota.isCiclica = !rota.isCiclica;
    this.salvarRotaNoFirebase(rota);
  }

  atualizarNomeRota(rota: RotaVisual) {
    this.salvarRotaNoFirebase(rota);
  }

  // Helper para salvar no banco
  private async salvarRotaNoFirebase(rota: RotaVisual) {
    if (rota.id) {
      await this.rotaService.atualizarRota({
        id: rota.id,
        nome: rota.nome,
        cor: rota.cor,
        isCiclica: rota.isCiclica,
        caminho: rota.caminho || [],
        paradas: rota.paradas || []
      });
    }
  }

  // --- Renderização no Mapa ---

  private sincronizarInterface(rotasDoBanco: Rota[]) {
    this.rotasVisuais.forEach(r => this.limparDesenhosDaRota(r));

    this.rotasVisuais = rotasDoBanco.map(r => {
      const visual: RotaVisual = { ...r, marcadoresObj: [] };
      this.desenharRotaNoMapa(visual);
      return visual;
    });

    if (this.rotaSelecionada) {
      const rotaAindaExiste = this.rotasVisuais.find(r => r.id === this.rotaSelecionada!.id);
      this.rotaSelecionada = rotaAindaExiste || null;
    }
  }

  private desenharRotaNoMapa(rota: RotaVisual) {
    rota.marcadoresObj = [];

    // 1. Desenha a LINHA DO TRAJETO e seus pontos invisíveis pro usuário
    if (rota.caminho && rota.caminho.length > 0) {
      const coordenadas = rota.caminho.map(p => [p.lat, p.lng] as [number, number]);
      
      // Se for cíclica, conecta o último ponto ao primeiro
      if (rota.isCiclica && coordenadas.length > 2) {
        coordenadas.push(coordenadas[0]);
      }

      rota.polylineObj = L.polyline(coordenadas, { 
        color: rota.cor, 
        weight: 5, 
        opacity: 0.7 
      }).addTo(this.map);

      // Desenha as bolinhas brancas (nós do caminho) APENAS PARA O ADMIN
      rota.caminho.forEach((p, index) => {
        const icon = L.divIcon({
          className: 'admin-path-node',
          html: `<div style="background:#fff; border: 2px solid ${rota.cor}; width:10px; height:10px; border-radius:50%; cursor:pointer;"></div>`,
          iconSize: [14, 14], iconAnchor: [7, 7]
        });
        
        const marker = L.marker([p.lat, p.lng], { icon }).addTo(this.map);
        
        // Evento de clique para a BORRACHA
        marker.on('click', (e) => {
          if (e.originalEvent) e.originalEvent.stopPropagation(); // Evita clicar no mapa por acidente
          
          if (this.modoEdicao === 'borracha') {
            rota.caminho.splice(index, 1);
            this.salvarRotaNoFirebase(rota);
          }
        });
        
        rota.marcadoresObj!.push(marker);
      });
    }

    // 2. Desenha as PARADAS DE ÔNIBUS
    if (rota.paradas && rota.paradas.length > 0) {
      const iconOnibus = L.divIcon({
        className: 'bus-stop-icon',
        html: `<div style="background-color:${rota.cor}; width:24px; height:24px; border-radius:50%; border:3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; color:white; font-weight:bold; font-size:12px; cursor:pointer;">B</div>`,
        iconSize: [30, 30], iconAnchor: [15, 15]
      });

      rota.paradas.forEach((p, index) => {
        const marker = L.marker([p.lat, p.lng], { icon: iconOnibus }).addTo(this.map);
        marker.bindPopup(`<b>${p.nome}</b>`);
        
        // Evento de clique para a BORRACHA e POPUP
        marker.on('click', (e) => {
          if (e.originalEvent) e.originalEvent.stopPropagation(); // Evita clicar no mapa
          
          if (this.modoEdicao === 'borracha') {
            rota.paradas.splice(index, 1);
            this.salvarRotaNoFirebase(rota);
          } else {
            // Se não estiver com a borracha, o clique normal abre o balão de texto (popup)
            marker.togglePopup();
          }
        });
        
        rota.marcadoresObj!.push(marker);
      });
    }
  }

  private limparDesenhosDaRota(rota: RotaVisual) {
    if (rota.polylineObj) this.map.removeLayer(rota.polylineObj);
    if (rota.marcadoresObj) {
      rota.marcadoresObj.forEach(m => this.map.removeLayer(m));
    }
  }
}
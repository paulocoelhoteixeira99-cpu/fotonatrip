import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CopyEmailButton from "@/components/CopyEmailButton";
import Link from "next/link";
import {
  Search,
  CreditCard,
  Camera,
  ShieldCheck,
  HelpCircle,
  Mail,
} from "lucide-react";

export const metadata = {
  title: "Central de Ajuda | fotonatrip",
  description:
    "Tire suas duvidas sobre como encontrar, comprar e baixar suas fotos na fotonatrip.",
};

const faqs = [
  {
    icon: Search,
    title: "Como encontro minhas fotos?",
    items: [
      {
        q: "Como funciona a busca por selfie?",
        a: 'Acesse "Buscar fotos", selecione o evento, tire uma selfie ou envie uma foto do seu rosto. Nossa inteligencia artificial compara seu rosto com todas as fotos do evento e mostra as que voce aparece.',
      },
      {
        q: "A busca por selfie e precisa?",
        a: "Sim. Usamos tecnologia de reconhecimento facial avancada que identifica rostos mesmo com oculos de sol, chapeu ou maquiagem. A precisao e superior a 95% na maioria dos casos.",
      },
      {
        q: "Posso ver todas as fotos de um evento?",
        a: 'Sim. Na pagina do evento, voce pode navegar por todas as fotos disponiveis ou filtrar pela aba "Sem rosto identificado" para ver fotos de paisagem, detalhes e grupos.',
      },
      {
        q: "Minha selfie e armazenada?",
        a: "Nao. A selfie e usada apenas no momento da busca para gerar uma representacao numerica (embedding) do seu rosto. A imagem da selfie nao e salva em nossos servidores.",
      },
    ],
  },
  {
    icon: CreditCard,
    title: "Compras e pagamentos",
    items: [
      {
        q: "Quais formas de pagamento sao aceitas?",
        a: "Aceitamos cartao de credito (Visa, Mastercard, Amex, Elo) e Pix. O pagamento via Pix e confirmado automaticamente em segundos.",
      },
      {
        q: "Como faco o download das fotos compradas?",
        a: 'Apos a confirmacao do pagamento, acesse "Minhas compras" no menu. La voce encontra todas as fotos adquiridas em alta resolucao, sem marca d\'agua, prontas para download.',
      },
      {
        q: "O pagamento e seguro?",
        a: "Sim. Todos os pagamentos sao processados pelo Mercado Pago, uma das maiores plataformas de pagamento da America Latina. Nenhum dado de cartao e armazenado em nossos servidores.",
      },
      {
        q: "Posso comprar fotos em pacote?",
        a: "Sim. Ao adicionar mais de uma foto ao carrinho, o preco por foto pode ser menor dependendo da politica de precos definida pelo fotografo do evento.",
      },
      {
        q: "Meu pagamento Pix esta pendente, o que faco?",
        a: 'Na pagina "Minhas compras", clique em "Verificar" ao lado do pedido pendente. Se o Pix ja foi pago, o status sera atualizado automaticamente.',
      },
    ],
  },
  {
    icon: Camera,
    title: "Para fotografos",
    items: [
      {
        q: "Como comeco a vender minhas fotos?",
        a: 'Crie uma conta como "Fotografo", acesse o painel, crie um evento e faca o upload das fotos. Nosso sistema processa automaticamente cada foto para identificar rostos.',
      },
      {
        q: "Qual o valor da comissao da plataforma?",
        a: "A fotonatrip cobra 7% sobre cada venda. Voce recebe 93% do valor diretamente na sua conta do Mercado Pago.",
      },
      {
        q: "Posso definir o preco das fotos?",
        a: "Sim. Voce define o preco por foto e os descontos de pacote ao criar ou editar o evento. O preco padrao sugerido e R$ 15,00 por foto.",
      },
      {
        q: "Por quanto tempo as fotos ficam disponiveis?",
        a: "Os eventos e fotos sao mantidos por 3 meses apos a criacao. Apos esse periodo, fotos nao compradas sao removidas automaticamente. Fotos ja compradas ficam disponiveis para sempre para o cliente.",
      },
      {
        q: "Como compartilho o evento com os participantes?",
        a: "No painel do evento, voce encontra um QR Code e um link direto para compartilhar com os participantes via WhatsApp, redes sociais ou impresso no local.",
      },
    ],
  },
  {
    icon: ShieldCheck,
    title: "Privacidade e seguranca",
    items: [
      {
        q: "Meus dados estao seguros?",
        a: "Sim. Utilizamos criptografia em todas as comunicacoes, autenticacao segura e seguimos as diretrizes da LGPD (Lei Geral de Protecao de Dados).",
      },
      {
        q: "Como a fotonatrip usa reconhecimento facial?",
        a: "O reconhecimento facial e usado exclusivamente para ajudar voce a encontrar suas fotos nos eventos. Nao compartilhamos dados biometricos com terceiros e voce pode solicitar a exclusao a qualquer momento.",
      },
      {
        q: "Posso excluir minha conta e meus dados?",
        a: 'Sim. Entre em contato pelo email fotonatrip2026@gmail.com solicitando a exclusao. Removeremos todos os seus dados pessoais conforme previsto na LGPD. Veja nossa <a href="/privacidade" class="text-primary hover:text-primary-light">Politica de Privacidade</a> para mais detalhes.',
      },
    ],
  },
];

export default function AjudaPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen pt-28 pb-20">
        <div className="max-w-4xl mx-auto px-6">
          {/* Header */}
          <div className="text-center mb-16">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <HelpCircle className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Central de <span className="gradient-text">ajuda</span>
            </h1>
            <p className="text-muted text-lg max-w-xl mx-auto">
              Encontre respostas para as duvidas mais frequentes sobre a
              plataforma.
            </p>
          </div>

          {/* FAQ sections */}
          <div className="space-y-12">
            {faqs.map((section) => (
              <div key={section.title}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <section.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h2 className="text-xl font-semibold">{section.title}</h2>
                </div>
                <div className="space-y-4">
                  {section.items.map((item) => (
                    <div
                      key={item.q}
                      className="glass rounded-2xl p-6 hover:bg-white/5 transition-colors"
                    >
                      <h3 className="font-medium mb-2">{item.q}</h3>
                      <p
                        className="text-sm text-muted leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: item.a }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Contact */}
          <div className="mt-16 glass rounded-2xl p-8 text-center">
            <Mail className="w-8 h-8 text-primary mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">
              Ainda tem duvidas?
            </h2>
            <p className="text-muted text-sm mb-6">
              Entre em contato com a nossa equipe. Respondemos em ate 24 horas.
            </p>
            <CopyEmailButton />
          </div>

          {/* Links */}
          <div className="mt-8 flex justify-center gap-6 text-sm text-muted">
            <Link
              href="/privacidade"
              className="hover:text-foreground transition-colors"
            >
              Politica de Privacidade
            </Link>
            <Link
              href="/termos"
              className="hover:text-foreground transition-colors"
            >
              Termos de Uso
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

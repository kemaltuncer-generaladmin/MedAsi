const fs = require('fs');

const path = './app/(onboarding)/setup/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// Import MessageSquare
content = content.replace('Shuffle,', 'Shuffle,\n  MessageSquare,');

// Add COMMUNICATION_STYLES before slideVariants
content = content.replace('const slideVariants: Variants = {', `const COMMUNICATION_STYLES = [
  { value: "formal", label: "Resmi ve Akademik", sub: "Profesyonel bir dil" },
  { value: "friendly", label: "Samimi ve Motive Edici", sub: "Arkadaşça bir yaklaşım" },
  { value: "socratic", label: "Sokratik (Düşündürücü)", sub: "Sorularla yönlendirme" },
];

const slideVariants: Variants = {`);

// Add state
content = content.replace('const [studyTime, setStudyTime] = useState<string>("");', `const [studyTime, setStudyTime] = useState<string>("");
  const [communicationStyle, setCommunicationStyle] = useState<string>("friendly");`);

// Add handleNext logic
content = content.replace('if (step === 3 && !studyTime) { setError("Tercih ettiğin çalışma zamanını seç."); return; }', `if (step === 3 && !studyTime) { setError("Tercih ettiğin çalışma zamanını seç."); return; }
    if (step === 3 && !communicationStyle) { setError("Lütfen bir iletişim tarzı seç."); return; }`);

// Add inside handleFinish result object
content = content.replace('tusExamDate: tusExamDate || undefined,', `tusExamDate: tusExamDate || undefined,
        communicationStyle,`);

// Add section in Step 3
const step3Add = `                  {/* Çalışma Zamanı */}
                  <div className="space-y-2">
                    <label
                      className="text-xs font-semibold uppercase tracking-wider"
                      style={{ color: "#64748B" }}
                    >
                      Tercih ettiğin çalışma zamanı
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {STUDY_TIMES.map(({ value, label, sub, Icon }) => {
                        const sel = studyTime === value;
                        return (
                          <button
                            key={value}
                            onClick={() => setStudyTime(value)}
                            className="flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-all"
                            style={{
                              background: sel ? "rgba(0,196,235,0.10)" : "#0d0d12",
                              border: sel ? "2px solid #00C4EB" : "2px solid #1E1E24",
                            }}
                          >
                            <Icon
                              size={16}
                              style={{ color: sel ? "#00C4EB" : "#64748B", flexShrink: 0 }}
                            />
                            <div>
                              <div
                                className="text-sm font-medium"
                                style={{ color: sel ? "#00C4EB" : "#CBD5E1" }}
                              >
                                {label}
                              </div>
                              <div className="text-xs" style={{ color: "#64748B" }}>{sub}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* İletişim Tarzı */}
                  <div className="space-y-2">
                    <label
                      className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider"
                      style={{ color: "#64748B" }}
                    >
                      <MessageSquare size={12} /> AI İletişim Tarzı (Çevresel Beyin)
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {COMMUNICATION_STYLES.map(({ value, label, sub }) => {
                        const sel = communicationStyle === value;
                        return (
                          <button
                            key={value}
                            onClick={() => setCommunicationStyle(value)}
                            className="rounded-xl py-3 px-3 text-center transition-all"
                            style={{
                              background: sel ? "rgba(0,196,235,0.12)" : "#0d0d12",
                              border: sel ? "2px solid #00C4EB" : "2px solid #1E1E24",
                            }}
                          >
                            <div
                              className="text-sm font-medium mb-1"
                              style={{ color: sel ? "#00C4EB" : "#CBD5E1" }}
                            >
                              {label}
                            </div>
                            <div className="text-xs" style={{ color: "#64748B" }}>
                              {sub}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>`;

content = content.replace(/\{\/\* Çalışma Zamanı \*\/\}.*?<\/div>.*?<\/div>/s, step3Add);

// Update step 4 summary
const summaryAdd = `                    <SummaryRow
                      icon={<Sun size={14} />}
                      label="Çalışma zamanı"
                      value={STUDY_TIMES.find((t) => t.value === studyTime)?.label ?? ""}
                    />
                    <SummaryRow
                      icon={<MessageSquare size={14} />}
                      label="İletişim Tarzı"
                      value={COMMUNICATION_STYLES.find((c) => c.value === communicationStyle)?.label ?? ""}
                    />`;

content = content.replace(/<SummaryRow\s+icon=\{<Sun size=\{14\} \/>\}\s+label="Çalışma zamanı".*?\/>/s, summaryAdd);

fs.writeFileSync(path, content, 'utf8');
console.log('Setup page updated.');

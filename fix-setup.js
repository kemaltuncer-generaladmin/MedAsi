const fs = require('fs');
const path = './app/(onboarding)/setup/page.tsx';
let content = fs.readFileSync(path, 'utf8');

const badChunk = `                    </div>
                  </div>
                            </div>`;

const goodChunk = `                    </div>
                  </div>
                </div>
              )}`;

content = content.replace(badChunk, goodChunk);
fs.writeFileSync(path, content, 'utf8');

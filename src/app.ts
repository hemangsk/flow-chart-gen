import { initializeMermaid } from './config/mermaidConfig';
import { UIController } from './modules/ui/uiController';

export class App {
    private uiController: UIController;

    constructor() {
        // Initialize Mermaid
        initializeMermaid();

        // Initialize UI Controller
        this.uiController = new UIController();
        this.uiController.initialize();
    }
} 
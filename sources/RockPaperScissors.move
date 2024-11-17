module metaschool::BettingGame {
    use std::string::{String, utf8};
    use std::signer;
    use aptos_framework::coin::{Self, Coin};
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::randomness;
    use aptos_framework::account;
    use aptos_framework::event::{Self, EventHandle};
    
    // Admin address constant
    const ADMIN_ADDRESS: address = @0x509ef83db206226a10dff19d90882a1c452a836aab4843e08e05d4b2b631f28a;

    // Error codes
    const NOT_ADMIN: u64 = 1;
    const INSUFFICIENT_BALANCE: u64 = 2;
    const GAME_IN_PROGRESS: u64 = 3;
    const NO_ACTIVE_GAME: u64 = 4;
    const INVALID_SELECTION: u64 = 5;
    const NOT_WINNER: u64 = 6;
    const INVALID_BET_AMOUNT: u64 = 7;

    // Events
    struct GamePlayedEvent has drop, store {
        player: address,
        bet_amount: u64,
        multiplier: u64,
        result: String,
        winnings: u64,
    }

    struct CashoutEvent has drop, store {
        player: address,
        amount: u64,
        multiplier: u64
    }

    struct GameState has key {
        bet_amount: u64,
        current_multiplier: u64,
        computer_selection: String,
        game_result: String,
        is_active: bool,
        play_events: EventHandle<GamePlayedEvent>,
        cashout_events: EventHandle<CashoutEvent>
    }

    struct Treasury has key {
        coins: Coin<AptosCoin>,
        admin: address
    }

    public entry fun initialize_treasury(admin: &signer) {
        let admin_addr = signer::address_of(admin);
        assert!(admin_addr == ADMIN_ADDRESS, NOT_ADMIN);
        assert!(!exists<Treasury>(admin_addr), GAME_IN_PROGRESS);
        
        move_to(admin, Treasury {
            coins: coin::zero<AptosCoin>(),
            admin: admin_addr
        });
    }

    public entry fun initialize_game(account: &signer) {
        let account_addr = signer::address_of(account);
        assert!(!exists<GameState>(account_addr), GAME_IN_PROGRESS);
        
        move_to(account, GameState {
            bet_amount: 0,
            current_multiplier: 25,
            computer_selection: utf8(b""),
            game_result: utf8(b""),
            is_active: false,
            play_events: account::new_event_handle<GamePlayedEvent>(account),
            cashout_events: account::new_event_handle<CashoutEvent>(account)
        });
    }

    public entry fun place_bet(
        account: &signer,
        amount: u64,
        admin_address: address
    ) acquires GameState, Treasury {
        let player_addr = signer::address_of(account);
        
        assert!(coin::balance<AptosCoin>(player_addr) >= amount, INSUFFICIENT_BALANCE);
        
        let game_state = borrow_global_mut<GameState>(player_addr);
        assert!(!game_state.is_active, GAME_IN_PROGRESS);

        let treasury = borrow_global_mut<Treasury>(admin_address);
        assert!(admin_address == ADMIN_ADDRESS, NOT_ADMIN);

        let coins = coin::withdraw<AptosCoin>(account, amount);
        coin::merge(&mut treasury.coins, coins);

        game_state.bet_amount = amount;
        game_state.current_multiplier = 25;
        game_state.is_active = true;
    }

    // Changed to private entry function and added lint attribute
    #[lint::allow_unsafe_randomness]
    #[randomness]
    entry fun play_game(
        account: &signer,
        user_selection: String
    ) acquires GameState {
        let player_addr = signer::address_of(account);
        let game_state = borrow_global_mut<GameState>(player_addr);
        
        assert!(game_state.is_active, NO_ACTIVE_GAME);
        assert!(
            user_selection == utf8(b"Rock") ||
            user_selection == utf8(b"Paper") ||
            user_selection == utf8(b"Scissors"),
            INVALID_SELECTION
        );

        let random_number = randomness::u64_range(0, 3);
        
        if (random_number == 0) {
            game_state.computer_selection = utf8(b"Rock");
        } else if (random_number == 1) {
            game_state.computer_selection = utf8(b"Paper");
        } else {
            game_state.computer_selection = utf8(b"Scissors");
        };

        let initial_bet = game_state.bet_amount;
        let current_multiplier = game_state.current_multiplier;

        if (
            (user_selection == utf8(b"Rock") && game_state.computer_selection == utf8(b"Scissors")) ||
            (user_selection == utf8(b"Paper") && game_state.computer_selection == utf8(b"Rock")) ||
            (user_selection == utf8(b"Scissors") && game_state.computer_selection == utf8(b"Paper"))
        ) {
            game_state.game_result = utf8(b"Win");
            
            event::emit_event(&mut game_state.play_events, GamePlayedEvent {
                player: player_addr,
                bet_amount: initial_bet,
                multiplier: current_multiplier,
                result: utf8(b"Win"),
                winnings: initial_bet + ((initial_bet * current_multiplier) / 100)
            });
        } else {
            game_state.game_result = utf8(b"Lose");
            game_state.bet_amount = 0;
            game_state.current_multiplier = 25;
            game_state.is_active = false;

            event::emit_event(&mut game_state.play_events, GamePlayedEvent {
                player: player_addr,
                bet_amount: initial_bet,
                multiplier: current_multiplier,
                result: utf8(b"Lose"),
                winnings: 0
            });
        }
    }

    public entry fun continue_game(account: &signer) acquires GameState {
        let game_state = borrow_global_mut<GameState>(signer::address_of(account));
        assert!(game_state.is_active, NO_ACTIVE_GAME);
        assert!(game_state.game_result == utf8(b"Win"), NOT_WINNER);

        game_state.current_multiplier = game_state.current_multiplier + 25;
    }

    public entry fun cash_out(
        account: &signer,
        admin_address: address
    ) acquires GameState, Treasury {
        let player_addr = signer::address_of(account);
        let game_state = borrow_global_mut<GameState>(player_addr);
        
        assert!(game_state.is_active, NO_ACTIVE_GAME);
        assert!(game_state.game_result == utf8(b"Win"), NOT_WINNER);

        let treasury = borrow_global_mut<Treasury>(admin_address);
        assert!(admin_address == ADMIN_ADDRESS, NOT_ADMIN);
        
        let multiplier_bonus = (game_state.bet_amount * game_state.current_multiplier) / 100;
        let total_winnings = game_state.bet_amount + multiplier_bonus;

        let winning_coins = coin::extract(&mut treasury.coins, total_winnings);
        coin::deposit(player_addr, winning_coins);

        event::emit_event(&mut game_state.cashout_events, CashoutEvent {
            player: player_addr,
            amount: total_winnings,
            multiplier: game_state.current_multiplier
        });

        game_state.bet_amount = 0;
        game_state.current_multiplier = 25;
        game_state.is_active = false;
    }

    public fun get_game_state(account: &signer): (u64, u64, String, String, bool) acquires GameState {
        let game_state = borrow_global<GameState>(signer::address_of(account));
        (
            game_state.bet_amount,
            game_state.current_multiplier,
            game_state.computer_selection,
            game_state.game_result,
            game_state.is_active
        )
    }
}